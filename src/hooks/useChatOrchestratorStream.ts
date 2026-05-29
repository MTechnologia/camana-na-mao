import { useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseAnonKey } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";
import { useToast } from "@/hooks/use-toast";
import { normalizeServiceTypeToDbEnum } from "@/lib/publicServiceType";
import { parseTransportReportPreviewJson } from "@/lib/parseTransportReportPreview";
import { createClientId } from "@/lib/clientId";
import { extractCollectionProgressJsonObjects } from "@/lib/chatCollectionProgress";
import { appendMessageByIdIfMissing, shouldEnterLightJourney } from "@/lib/chatJourneyState";
import {
  describeAiOrchestratorFailure,
  isStatementTimeoutFailure,
  RATE_LIMIT_RETRY_DELAY_MS,
  shouldIgnoreStaleCollectionProgress,
  shouldRetryAfterRateLimit,
  sleep,
  STATEMENT_TIMEOUT_ASSISTANT_MESSAGE,
} from "@/lib/chatOrchestratorClient";
import { trackChatJourneyEvent } from "@/lib/chatAnalytics";
import { LIGHT_JOURNEY_TYPES, VALID_TRACKER_TYPES } from "@/hooks/useChatJourneyConstants";
import { applyOutgoingFieldHeuristics } from "@/hooks/chat/fieldHeuristics";
import { uploadChatAttachments } from "@/hooks/chat/uploadChatAttachments";
import { createUserChatMessage, type ChatMessage, type CreatedReport } from "@/hooks/chat/types";
import type { EvaluationContext } from "@/hooks/chat/types";

export interface UseChatOrchestratorStreamParams {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  conversationIdRef: React.MutableRefObject<string | null>;
  collectionType: CollectionType | null;
  setCollectionType: React.Dispatch<React.SetStateAction<CollectionType>>;
  collectedFields: CollectedFields;
  setCollectedFields: React.Dispatch<React.SetStateAction<CollectedFields>>;
  lightJourneyType: string | null;
  setLightJourneyType: React.Dispatch<React.SetStateAction<string | null>>;
  createdReport: CreatedReport | null;
  setCreatedReport: React.Dispatch<React.SetStateAction<CreatedReport | null>>;
  evaluationContext?: EvaluationContext | null;
}

export function useChatOrchestratorStream(params: UseChatOrchestratorStreamParams) {
  const { toast } = useToast();
  const progressParseWarnedRef = useRef(false);
  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    user,
    conversationIdRef,
    collectionType,
    setCollectionType,
    collectedFields,
    setCollectedFields,
    lightJourneyType,
    setLightJourneyType,
    createdReport,
    setCreatedReport,
    evaluationContext,
  } = params;

  const sendMessage = useCallback(async (
    content: string,
    options?: { attachmentFiles?: File[]; existingUserMessageId?: string },
  ) => {
    applyOutgoingFieldHeuristics({
      content,
      messages,
      collectionType,
      collectedFields,
      setCollectedFields,
    });
    // Evita duplicar a bolha do usuário quando já existe mensagem otimista com o mesmo texto
    // (chip na tela inicial: addOptimisticMessage + sendMessage via pendingMessageRef).
    // Não exigir isLoading aqui: no início de sendMessage isLoading ainda é false, e exigir isLoading
    // fazia append duplicado → duas vezes "Quero falar sobre a cidade".
    const trimmedContent = content.trim();
    const lastMessage = messages[messages.length - 1];
    const hasOptimisticMessage =
      !!lastMessage &&
      lastMessage.role === "user" &&
      lastMessage.content === trimmedContent;

    // Evita segunda requisição idêntica (ex.: duplo disparo do efeito ou duplo clique antes da resposta)
    if (
      isLoading &&
      lastMessage?.role === "user" &&
      lastMessage.content === trimmedContent
    ) {
      console.warn("[useUnifiedAIChat] Ignoring duplicate send (same text while request in flight)");
      return;
    }

    let attachmentUrls: string[] = [];
    if (options?.attachmentFiles?.length && user) {
      const uploadResult = await uploadChatAttachments(
        options.attachmentFiles,
        user.id,
        (fileName) => {
          toast({
            title: "Foto muito grande",
            description: `Máximo 50MB por imagem. "${fileName}" foi ignorada.`,
            variant: "destructive",
          });
        },
        () => {
          toast({
            title: "Erro ao enviar foto",
            description: "Não foi possível enviar uma das imagens. Tente novamente.",
            variant: "destructive",
          });
        },
      );
      attachmentUrls = uploadResult.urls;
    }

    const userMessage = createUserChatMessage(trimmedContent, {
      id: options?.existingUserMessageId,
      attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
    });

    // Só adiciona se não houver mensagem otimista
    if (!hasOptimisticMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }
    setIsLoading(true);
    progressParseWarnedRef.current = false;

    // Save user message to database
    if (conversationIdRef.current && user) {
      try {
        const { data: currentConv } = await supabase
          .from('ai_conversations')
          .select('messages, title')
          .eq('id', conversationIdRef.current)
          .single();

        if (currentConv) {
          const currentMessages = (currentConv.messages as Array<Record<string, unknown>>) || [];
          const updatedMessages = appendMessageByIdIfMissing(
            currentMessages,
            userMessage as unknown as Record<string, unknown>,
          );
          
          await supabase
            .from('ai_conversations')
            .update({
              messages: updatedMessages as Json,
              last_message_at: new Date().toISOString(),
              title: currentConv.title || trimmedContent.slice(0, 50),
            })
            .eq('id', conversationIdRef.current);
        }
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }

    try {
      // ALWAYS try to refresh session first to ensure we have a valid token
      console.log('[useUnifiedAIChat] Attempting to refresh session...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      let session = refreshedSession;
      
      // If refresh failed, try to get current session as fallback
      if (refreshError || !refreshedSession) {
        console.warn('[useUnifiedAIChat] Refresh failed, trying getSession as fallback...', refreshError);
        const { data: { session: currentSession }, error: currentError } = await supabase.auth.getSession();
        
        if (currentError || !currentSession) {
          console.error('[useUnifiedAIChat] Both refresh and getSession failed:', currentError || refreshError);
          // Clear invalid session
          await supabase.auth.signOut();
          toast({
            title: "Sessão expirada",
            description: "Sua sessão expirou. Por favor, faça login novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        session = currentSession;
      } else {
        console.log('[useUnifiedAIChat] Session refreshed successfully');
      }
      
      const token = session?.access_token;
      
      if (!token) {
        console.error('[useUnifiedAIChat] No token found in session after refresh');
        await supabase.auth.signOut();
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Verify token is not expired (check exp claim)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const exp = payload.exp;
          const now = Math.floor(Date.now() / 1000);
          
          // Check if token is expired or will expire in the next 30 seconds
          if (exp && exp < (now + 30)) {
            console.warn('[useUnifiedAIChat] Token is expired or expiring soon, attempting another refresh...');
            const { data: { session: finalRefreshedSession }, error: finalRefreshError } = await supabase.auth.refreshSession();
            
            if (finalRefreshError || !finalRefreshedSession?.access_token) {
              console.error('[useUnifiedAIChat] Failed to refresh expired token:', finalRefreshError);
              await supabase.auth.signOut();
              toast({
                title: "Sessão expirada",
                description: "Faça login novamente para continuar.",
                variant: "destructive",
              });
              setIsLoading(false);
              return;
            }
            
            session = finalRefreshedSession;
            console.log('[useUnifiedAIChat] Token refreshed after expiration check');
          }
        }
      } catch (tokenCheckError) {
        console.warn('[useUnifiedAIChat] Could not check token expiration:', tokenCheckError);
        // Continue anyway - let the server validate
      }
      
      const finalToken = session?.access_token;
      if (!finalToken) {
        console.error('[useUnifiedAIChat] No token after all checks');
        await supabase.auth.signOut();
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log('[useUnifiedAIChat] Token found, length:', finalToken.length);

      // CRITICAL: Deduplicate messages when there's an optimistic message
      // If hasOptimisticMessage is true, the message already exists in 'messages' state
      // So we don't add userMessage again to avoid duplicates
      const effectiveMessages = hasOptimisticMessage 
        ? messages  // Already contains the optimistic message
        : [...messages, userMessage]; // Add new message
      
      const payload = {
        messages: effectiveMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          ...(msg.attachmentUrls && msg.attachmentUrls.length > 0 && { attachmentUrls: msg.attachmentUrls }),
        })),
        conversationId: conversationIdRef.current,
        // Pass frontend context: structured type OR light journey type
        collectionType: collectionType || lightJourneyType || undefined,
        // Avaliação conversacional: contexto da visita para pular coleta de serviço
        evaluationContext: evaluationContext || undefined,
      };
      
      console.log('[useUnifiedAIChat] Payload message count:', effectiveMessages.length, 'hasOptimistic:', hasOptimisticMessage);

      const supabaseUrl =
        import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("Missing CAMARA_URL (or VITE_SUPABASE_URL)");
      if (!supabaseAnonKey) {
        console.warn("[useUnifiedAIChat] CAMARA_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY ausente — chamadas à Edge Function podem falhar.");
      }

      const turnStartMs = Date.now();

      // Always call the unified orchestrator
      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-orchestrator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${finalToken}`,
            ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        console.error('[useUnifiedAIChat] API error:', response.status, errorText);

        if (isStatementTimeoutFailure(errorText)) {
          trackChatJourneyEvent("chat_turn_failed", {
            conversation_id: conversationIdRef.current,
            journey_type: collectionType || lightJourneyType,
            error_kind: "statement_timeout",
            latency_ms: Date.now() - turnStartMs,
          });
          toast({
            title: "Sistema demorou para responder",
            description: "Aguarde alguns instantes e tente enviar novamente.",
            variant: "destructive",
          });
          setMessages((prev) => [
            ...prev,
            {
              id: createClientId("chat-message"),
              role: "assistant",
              content: STATEMENT_TIMEOUT_ASSISTANT_MESSAGE,
              timestamp: new Date().toISOString(),
              source: "Assistente Câmara na Mão",
            },
          ]);
          setIsLoading(false);
          return;
        }

        const userFacingDetail = describeAiOrchestratorFailure(response.status, errorText);
        
        if (response.status === 429) {
          const rateLimitKey = `rate_limit_retry_${userMessage.id}`;
          if (shouldRetryAfterRateLimit(rateLimitKey)) {
            trackChatJourneyEvent("chat_rate_limit_retry", {
              conversation_id: conversationIdRef.current,
              journey_type: collectionType || lightJourneyType,
            });
            toast({
              title: "Muitas mensagens em sequência",
              description: "Tentando enviar novamente em alguns segundos…",
            });
            setIsLoading(false);
            await sleep(RATE_LIMIT_RETRY_DELAY_MS);
            await sendMessage(trimmedContent, { existingUserMessageId: userMessage.id });
            return;
          }
          toast({
            title: "Limite de uso atingido",
            description: "Aguarde um momento antes de tentar novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos ao workspace para continuar.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (response.status === 400) {
          toast({
            title: "Erro na requisição",
            description: userFacingDetail || "Verifique os dados enviados e tente novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        toast({
          title: "Erro ao enviar mensagem",
          description: userFacingDetail || "Não foi possível enviar a mensagem. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantMessageId = createClientId("chat-message");
      let textBuffer = "";

      if (!reader) throw new Error("No response body");

      const processSSELine = (line: string) => {
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return;
        if (!line.startsWith("data: ")) return;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;

          if (content) {
            assistantMessage += content;
            
            // Check for timeout marker and trigger auto-retry
            if (content.includes('[TIMEOUT]') || assistantMessage.includes('[TIMEOUT]')) {
              console.log('[useUnifiedAIChat] Timeout detected, will trigger auto-retry');
              // Remove timeout marker from message
              assistantMessage = assistantMessage.replace(/\[TIMEOUT\]/g, '');
            }
            
            // Check for collection progress markers (JSON com chaves balanceadas; strings podem conter ] e { ... })
            for (const { type: progressType, jsonStr: progressJsonStr } of extractCollectionProgressJsonObjects(
              assistantMessage,
            )) {
              const type = progressType as CollectionType;
              try {
                const fields = JSON.parse(progressJsonStr);
                console.log('[useUnifiedAIChat] Collection progress detected:', type, fields);
                
                // === CRITICAL FIX: Respect explicit JOURNEY_SWITCHED from user ===
                // If the user just switched journeys, ignore COLLECTION_PROGRESS from different type
                // This prevents the backend from overriding explicit user journey choice
                const lastUserMsgContent = [...messages].reverse().find(m => m.role === 'user')?.content || '';
                if (shouldIgnoreStaleCollectionProgress({
                  progressType: type,
                  lastUserMessageContent: lastUserMsgContent,
                })) {
                  console.log('[useUnifiedAIChat] Ignoring stale COLLECTION_PROGRESS:', type, '- user switched journey');
                  continue;
                }
                
                // === PHASE 2: Only update collectionType if it's a valid structured type ===
                // This prevents light intents (services, audiencias, general, history) from
                // replacing an ongoing structured journey
                const mergeFields = (raw: Record<string, unknown>) => {
                  const next = { ...raw };
                  if (typeof next.service_type === "string") {
                    const n = normalizeServiceTypeToDbEnum(next.service_type);
                    if (n) next.service_type = n;
                  }
                  return next;
                };
                const fieldsNorm = mergeFields(fields);

                if (VALID_TRACKER_TYPES.includes(type)) {
                  setCollectionType(type);
                  if (lightJourneyType) {
                    setLightJourneyType(null);
                  }
                  setCollectedFields(prev => ({ ...prev, ...fieldsNorm }));
                } else {
                  console.log('[useUnifiedAIChat] Ignoring non-structured type:', type, '- keeping current journey');
                  // Only update fields if we already have a structured type set
                  if (collectionType && VALID_TRACKER_TYPES.includes(collectionType)) {
                    setCollectedFields(prev => ({ ...prev, ...fieldsNorm }));
                  }
                }
              } catch (e) {
                console.warn('[useUnifiedAIChat] Failed to parse collection progress:', progressJsonStr, e);
                if (!progressParseWarnedRef.current) {
                  progressParseWarnedRef.current = true;
                  toast({
                    title: "Progresso temporariamente indisponível",
                    description:
                      "A barra de etapas pode não atualizar agora. Continue respondendo normalmente.",
                  });
                }
              }
            }
            
            // Detect LIGHT_JOURNEY markers from backend (for services, audiencias, etc.)
            const lightJourneyMatch = assistantMessage.match(/\[LIGHT_JOURNEY:(\w+)\]/);
            if (lightJourneyMatch) {
              const journey = lightJourneyMatch[1];
              if (LIGHT_JOURNEY_TYPES.includes(journey) && lightJourneyType !== journey) {
                const lastUserMsgContent = [...messages].reverse().find(m => m.role === 'user')?.content || '';
                const explicitSwitchToLight = lastUserMsgContent.includes(`[JOURNEY_SWITCHED:${journey}]`);
                const canEnterLightJourney = shouldEnterLightJourney({
                  currentCollectionType: collectionType,
                  validTrackerTypes: VALID_TRACKER_TYPES,
                  explicitSwitchToLight,
                });
                if (!canEnterLightJourney) {
                  console.log(
                    '[useUnifiedAIChat] Ignoring LIGHT_JOURNEY marker to avoid clearing structured tracker:',
                    journey,
                  );
                } else {
                console.log('[useUnifiedAIChat] Light journey detected:', journey);
                setLightJourneyType(journey);
                // Clear structured journey when entering light journey
                if (collectionType) {
                  setCollectionType(null);
                  setCollectedFields({});
                }
                }
              }
            }
            
            // FIELD_REQUEST markers are primarily used by the backend for deterministic parsing.
            // The UI tracker updates via COLLECTION_PROGRESS and local heuristics on user send.

            // Check for report markers
            // Check for report markers - sync final fields from agent summary, then mark as created
            const urbanMatch = assistantMessage.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
            if (urbanMatch && !createdReport) {
              // CRITICAL: Parse final fields from agent success message to sync tracker
              const finalFields: Record<string, unknown> = { ...collectedFields };
              
              // Extract risk level from summary
              const riskMatch = assistantMessage.match(/Nível de risco:[*]?[*]?\s*(\w+)/i);
              if (riskMatch) {
                const riskMap: Record<string, string> = {
                  'crítico': 'critical', 'critico': 'critical',
                  'moderado': 'moderate',
                  'baixo': 'low',
                  'nenhum': 'none'
                };
                finalFields.risk_level = riskMap[riskMatch[1].toLowerCase()] || riskMatch[1];
              }
              
              // Extract scope from summary
              const scopeMatch = assistantMessage.match(/Escopo[^:]*:[*]?[*]?\s*([^\n•*]+)/i);
              if (scopeMatch) {
                const scopeMap: Record<string, string> = {
                  'bairro todo': 'neighborhood', 'bairro': 'neighborhood',
                  'rua toda': 'street', 'rua': 'street',
                  'apenas eu': 'individual', 'individual': 'individual',
                  'zona': 'zone', 'cidade': 'city'
                };
                const scopeKey = scopeMatch[1].toLowerCase().trim();
                finalFields.affected_scope = scopeMap[scopeKey] || scopeKey;
              }
              
              // Extract category from summary if present
              const catMatch = assistantMessage.match(/Categoria:[*]?[*]?\s*([^\n•*]+)/i);
              if (catMatch && !finalFields.category) {
                finalFields.category = catMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
              }
              
              // Update tracker with final fields before marking as created
              setCollectedFields(finalFields);
              
              setCreatedReport({ type: 'urban_report', id: urbanMatch[1] });
              // DO NOT clear sessionStorage - tracker should remain visible after navigation
              // The tracker serves as a "receipt" showing collected data
            }
            
            const transportMatch = assistantMessage.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
            if (transportMatch && !createdReport) {
              // Sync final fields from agent summary
              const finalFields: Record<string, unknown> = { ...collectedFields };
              
              const tipoMatch = assistantMessage.match(/Tipo:[*]?[*]?\s*([^\n•*]+)/i);
              if (tipoMatch) finalFields.report_type = tipoMatch[1].trim();
              
              const linhaMatch = assistantMessage.match(/Linha:[*]?[*]?\s*([^\n•*]+)/i);
              if (linhaMatch) finalFields.line_code = linhaMatch[1].trim();
              
              const dataMatch = assistantMessage.match(/Data:[*]?[*]?\s*([^\n•*]+)/i);
              if (dataMatch) finalFields.occurrence_date = dataMatch[1].trim();

              const timeMatch = assistantMessage.match(/Horário:[*]?[*]?\s*([^\n•*]+)/i);
              if (timeMatch) finalFields.occurrence_time = timeMatch[1].trim();

              const directionMatch = assistantMessage.match(/Sentido:[*]?[*]?\s*([^\n•*]+)/i);
              if (directionMatch) finalFields.direction = directionMatch[1].trim().toLowerCase();

              const recurrenceMatch = assistantMessage.match(/Frequência:[*]?[*]?\s*([^\n•*]+)/i);
              if (recurrenceMatch) {
                const recurrenceRaw = recurrenceMatch[1].trim().toLowerCase();
                if (recurrenceRaw.includes('primeira vez')) finalFields.recurrence_frequency = 'primeira_vez';
                else if (recurrenceRaw.includes('algumas vezes')) finalFields.recurrence_frequency = 'algumas_vezes_mes';
                else if (recurrenceRaw.includes('toda semana')) finalFields.recurrence_frequency = 'toda_semana';
                else if (recurrenceRaw.includes('todos os dias')) finalFields.recurrence_frequency = 'todos_os_dias';
              }
              
              const sevMatch = assistantMessage.match(/Gravidade:[*]?[*]?\s*(\w+)/i);
              if (sevMatch) {
                const sevMap: Record<string, string> = {
                  'alta': 'high', 'crítica': 'critical', 'critica': 'critical',
                  'média': 'medium', 'media': 'medium', 'baixa': 'low'
                };
                finalFields.severity = sevMap[sevMatch[1].toLowerCase()] || sevMatch[1];
              }

              const transportPreviewDone = parseTransportReportPreviewJson(assistantMessage);
              if (transportPreviewDone?.personal_impact != null) {
                finalFields.personal_impact = transportPreviewDone.personal_impact;
              }
              
              setCollectedFields(finalFields);
              setCreatedReport({ type: 'transport', id: transportMatch[1] });
            }
            
            const ratingMatch = assistantMessage.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
            if (ratingMatch && !createdReport) {
              // Sync final fields from agent summary
              const finalFields: Record<string, unknown> = { ...collectedFields };
              
              const tipoMatch = assistantMessage.match(/Tipo:[*]?[*]?\s*([^\n•*]+)/i);
              if (tipoMatch) {
                const typeMap: Record<string, string> = {
                  'ubs': 'ubs', 'escola': 'school', 'ceu': 'ceu',
                  'hospital': 'hospital', 'biblioteca': 'library'
                };
                const typeKey = tipoMatch[1].toLowerCase().trim();
                finalFields.service_type = typeMap[typeKey] || tipoMatch[1].trim();
              }
              
              const nomeMatch = assistantMessage.match(/Serviço:[*]?[*]?\s*([^\n•*]+)/i);
              if (nomeMatch) finalFields.service_name = nomeMatch[1].trim();
              
              const notaMatch = assistantMessage.match(/Nota:[*]?[*]?\s*(\d)/i);
              if (notaMatch) finalFields.rating_stars = parseInt(notaMatch[1]);
              
              setCollectedFields(finalFields);
              setCreatedReport({ type: 'rating', id: ratingMatch[1] });
            }
            
            // CRITICAL FIX: Store RAW message (with markers) in state
            // Markers are needed for backend correlation on next request
            // UI sanitization happens in ChatMessageBubble for display only
            
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === "assistant" && lastMsg.id === assistantMessageId) {
                return prev.slice(0, -1).concat({
                  ...lastMsg,
                  content: assistantMessage, // RAW content WITH markers
                });
              }
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: assistantMessage, // RAW content WITH markers
                  timestamp: new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  source: "Assistente Câmara na Mão",
                },
              ];
            });
          }

          if (parsed.conversationId) {
            conversationIdRef.current = parsed.conversationId;
          }
        } catch (e) {
          // Incomplete JSON, continue buffering
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          const line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          processSSELine(line);
        }
      }

      if (textBuffer.trim()) {
        processSSELine(textBuffer);
      }

      // Check if timeout occurred and trigger auto-retry (only once per message)
      const timeoutDetected = assistantMessage.includes('[TIMEOUT]') || 
                               assistantMessage.includes('demorando mais que o normal');
      
      if (timeoutDetected) {
        console.log('[useUnifiedAIChat] Timeout detected, checking for auto-retry');
        
        // Get the last user message
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        
        // Only retry if:
        // 1. We have a user message
        // 2. It doesn't already have a retry marker (prevent infinite loop)
        // 3. We haven't retried this message yet
        if (lastUserMessage && 
            !lastUserMessage.content.includes('[RETRY]') &&
            !sessionStorage.getItem(`retry_${lastUserMessage.id}`)) {
          
          console.log('[useUnifiedAIChat] Triggering auto-retry for timeout');
          
          // Mark this message as retried
          sessionStorage.setItem(`retry_${lastUserMessage.id}`, 'true');
          
          // Remove timeout message from UI
          setMessages(prev => prev.filter(m => 
            !m.content.includes('demorando mais que o normal') && 
            !m.content.includes('[TIMEOUT]')
          ));
          
          setIsLoading(false);
          
          // Wait 3 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Show retry message
          toast({
            title: "Tentando novamente...",
            description: "O serviço estava lento. Tentando novamente automaticamente.",
            duration: 2000,
          });
          
          // Retry the message
          const messageToRetry = lastUserMessage.content;
          await sendMessage(messageToRetry);
          return;
        } else {
          // Already retried or no user message, just clean up the timeout marker
          assistantMessage = assistantMessage.replace(/\[TIMEOUT\]/g, '');
        }
      }

      // Save assistant response - PRESERVE RAW CONTENT WITH MARKERS
      // This is critical for backend correlation on subsequent requests
      if (conversationIdRef.current && user && assistantMessage) {
        try {
          const { data: currentConv } = await supabase
            .from('ai_conversations')
            .select('messages')
            .eq('id', conversationIdRef.current)
            .single();

          if (currentConv) {
            // CRITICAL FIX: Save RAW assistantMessage (with markers) to database
            // The markers are needed for backend deterministic field capture
            // UI sanitization happens in ChatMessageBubble
            const finalAssistantMsg = {
              id: assistantMessageId,
              role: "assistant",
              content: assistantMessage, // RAW content WITH markers
              timestamp: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              source: "Assistente Câmara na Mão",
            };

            const currentMessages = (currentConv.messages as Array<Record<string, unknown>>) || [];
            const updatedMessages = appendMessageByIdIfMissing(
              currentMessages,
              finalAssistantMsg as unknown as Record<string, unknown>,
            );
            
            await supabase
              .from('ai_conversations')
              .update({
                messages: updatedMessages as Json,
                last_message_at: new Date().toISOString(),
              })
              .eq('id', conversationIdRef.current);
          }
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }

      if (assistantMessage) {
        trackChatJourneyEvent("chat_turn_completed", {
          conversation_id: conversationIdRef.current,
          journey_type: collectionType || lightJourneyType,
          fields_count: Object.keys(collectedFields).length,
          latency_ms: Date.now() - turnStartMs,
        });
      }
    } catch (error) {
      trackChatJourneyEvent("chat_turn_failed", {
        conversation_id: conversationIdRef.current,
        journey_type: collectionType || lightJourneyType,
        error_kind: error instanceof Error ? error.name : "unknown",
      });
      console.error("[useUnifiedAIChat] Error sending message:", error);
      console.error("[useUnifiedAIChat] Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Não foi possível enviar a mensagem.";
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- evaluationContext/lightJourneyType intentionally excluded
  }, [messages, user, toast, createdReport, collectionType, collectedFields, isLoading, setMessages, setIsLoading, setCollectionType, setCollectedFields, setLightJourneyType, setCreatedReport, conversationIdRef, evaluationContext]);

  return { sendMessage };
}
