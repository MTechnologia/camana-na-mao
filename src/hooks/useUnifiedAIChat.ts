import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";

// Sanitiza marcadores técnicos do conteúdo das mensagens
const sanitizeMessageContent = (content: string): string => {
  return content
    .replace(/\[REPORT_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[TRANSPORT_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[RATING_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[COLLECTION_PROGRESS:\w+:\{[^\]]*\}\]/g, '')
    .replace(/\[FIELD_REQUEST:\w+\]/g, '')
    .trim();
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  source?: string;
}

interface CreatedReport {
  type: 'urban_report' | 'transport' | 'rating';
  id: string;
}

export const useUnifiedAIChat = (
  conversationId?: string | null,
  initialCollectionType?: CollectionType
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
  const [collectionType, setCollectionType] = useState<CollectionType>(initialCollectionType || null);
  const [collectedFields, setCollectedFields] = useState<CollectedFields>({});
  const conversationIdRef = useRef<string | null>(conversationId || null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Storage key for tracker persistence
  const getTrackerStorageKey = (convId: string | null) => 
    convId ? `cmsp_tracker_${convId}` : null;

  // Sync conversationIdRef with prop changes
  useEffect(() => {
    if (conversationId !== conversationIdRef.current) {
      conversationIdRef.current = conversationId || null;
    }
  }, [conversationId]);

  // Sincroniza collectionType quando initialCollectionType muda
  useEffect(() => {
    if (initialCollectionType) {
      console.log('[useUnifiedAIChat] Setting collectionType from initial:', initialCollectionType);
      setCollectionType(initialCollectionType);
    }
  }, [initialCollectionType]);

  // Load tracker state from sessionStorage when conversation changes
  useEffect(() => {
    const storageKey = getTrackerStorageKey(conversationId || null);
    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const { type, fields } = JSON.parse(saved);
          console.log('[useUnifiedAIChat] Restored tracker from session:', type, fields);
          if (type) setCollectionType(type);
          if (fields && Object.keys(fields).length > 0) setCollectedFields(fields);
          return; // Don't reset if we restored
        }
      } catch (e) {
        console.warn('[useUnifiedAIChat] Failed to restore tracker:', e);
      }
    }
    // Reset if no saved state (but respect initialCollectionType)
    setIsHistoryLoaded(false);
    setCreatedReport(null);
    if (!initialCollectionType) {
      setCollectionType(null);
    }
    setCollectedFields({});
  }, [conversationId, initialCollectionType]);

  // Persist tracker state to sessionStorage when it changes
  useEffect(() => {
    const storageKey = getTrackerStorageKey(conversationIdRef.current);
    if (storageKey && (collectionType || Object.keys(collectedFields).length > 0)) {
      sessionStorage.setItem(storageKey, JSON.stringify({
        type: collectionType,
        fields: collectedFields
      }));
    }
  }, [collectionType, collectedFields]);

  // Load messages from database when conversationId changes
  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!conversationId || !user) {
        // Não limpa mensagens se não há conversa - preserva mensagens otimistas
        setIsHistoryLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ai_conversations')
          .select('messages')
          .eq('id', conversationId)
          .single();

        if (error) throw error;

        const savedMessages = (data.messages as any[]) || [];
        
        if (savedMessages.length === 0) {
          // Sem greeting - preserva apenas mensagens otimistas do usuário
          setMessages(prev => prev.filter(msg => msg.role === "user"));
        } else {
          // Garante que todas as mensagens tenham timestamp e sanitiza conteúdo
          const messagesWithTimestamp = savedMessages.map(msg => ({
            ...msg,
            content: msg.role === 'assistant' ? sanitizeMessageContent(msg.content || '') : msg.content,
            timestamp: msg.timestamp || ''
          }));
          
          // Preserva mensagens otimistas que ainda não foram salvas no banco
          setMessages(prev => {
            const optimisticUserMessages = prev.filter(
              msg => msg.role === "user" && 
              !savedMessages.some(saved => saved.content === msg.content)
            );
            if (optimisticUserMessages.length > 0) {
              return [...messagesWithTimestamp, ...optimisticUserMessages];
            }
            return messagesWithTimestamp;
          });
          
          // Check for report markers in history
          for (const msg of savedMessages) {
            const urbanMatch = msg.content?.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
            if (urbanMatch) {
              setCreatedReport({ type: 'urban_report', id: urbanMatch[1] });
              break;
            }
            const transportMatch = msg.content?.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
            if (transportMatch) {
              setCreatedReport({ type: 'transport', id: transportMatch[1] });
              break;
            }
            const ratingMatch = msg.content?.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
            if (ratingMatch) {
              setCreatedReport({ type: 'rating', id: ratingMatch[1] });
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsHistoryLoaded(true);
      }
    };

    loadConversationMessages();
  }, [conversationId, user?.id]);

  const clearCreatedReport = useCallback(() => {
    setCreatedReport(null);
  }, []);

  // Adiciona mensagem do usuário de forma otimista (antes da conversa ser criada)
  const addOptimisticMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([userMessage]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    // Heurísticas de UI: quando o assistente faz perguntas estruturadas, atualizamos o tracker
    // imediatamente no envio do usuário (sem depender de marcadores do backend).
    if (collectionType === 'urban_report') {
      const lastAssistantText = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
      const lastAssistantLower = lastAssistantText.toLowerCase();
      const raw = content.trim();
      const rawLower = raw.toLowerCase();

      // 0) Detect Address Picker structured address (from Google Places)
      if (rawLower.includes('endereço selecionado:') && rawLower.includes(' - cep:')) {
        // User selected an address from the picker - mark all location fields
        setCollectedFields(prev => ({
          ...prev,
          street: true,
          neighborhood: true,
          cep: true,
        }));
      }
      
      // 0.5) Categoria - detecta confirmação de feedback ou classificação na conversa
      if (!collectedFields.category) {
        // Detecta quando IA oferece registrar como feedback e usuário aceita
        const isOfferingFeedback = lastAssistantLower.includes('registrar') && 
                                   (lastAssistantLower.includes('feedback') || 
                                    lastAssistantLower.includes('preocupação') || 
                                    lastAssistantLower.includes('câmara'));
        const userAccepts = rawLower.includes('sim') || rawLower.includes('desejo') || 
                           rawLower.includes('quero') || rawLower.includes('pode') || 
                           rawLower.includes('ok') || rawLower.includes('aceito');
        
        if (isOfferingFeedback && userAccepts) {
          setCollectedFields(prev => ({ ...prev, category: 'feedback_camara' }));
        }
        
        // Detecta quando IA confirma categoria via texto
        const categoryConfirmPatterns = [
          { pattern: /problema de \*?\*?ilumina[çc][ãa]o\*?\*?/i, category: 'iluminacao' },
          { pattern: /problema de \*?\*?via p[úu]blica\*?\*?/i, category: 'via_publica' },
          { pattern: /problema de \*?\*?cal[çc]ada\*?\*?/i, category: 'calcada' },
          { pattern: /problema de \*?\*?lixo\*?\*?/i, category: 'lixo' },
          { pattern: /problema de \*?\*?esgoto\*?\*?/i, category: 'esgoto' },
          { pattern: /problema de \*?\*?[áa]rea verde\*?\*?/i, category: 'area_verde' },
          { pattern: /feedback.*c[âa]mara/i, category: 'feedback_camara' },
          { pattern: /registrar.*preocupa[çc][ãa]o.*c[âa]mara/i, category: 'feedback_camara' },
          { pattern: /registrar como feedback/i, category: 'feedback_camara' },
        ];
        
        for (const { pattern, category } of categoryConfirmPatterns) {
          if (pattern.test(lastAssistantText)) {
            setCollectedFields(prev => ({ ...prev, category }));
            break;
          }
        }
      }

      // 1) Número / Referência
      if (!collectedFields.street_number) {
        const askedForNumber = /\bn[úu]mero\b/i.test(lastAssistantText);
        if (askedForNumber) {
          const numberMatch = raw.match(/^(\d+[A-Za-z]?|s\/?n|sem\s*n[úu]mero)$/i) || raw.match(/^(\d+)\b/);
          if (numberMatch) {
            const extracted = (numberMatch[1] || numberMatch[0] || raw).toUpperCase();
            setCollectedFields(prev => ({ ...prev, street_number: extracted }));
          } else if (!collectedFields.reference_point && raw.length > 0) {
            // Se não for número, mas a pergunta foi "número ou ponto de referência", marca referência.
            if (lastAssistantLower.includes('ponto de referência') || lastAssistantLower.includes('referência')) {
              setCollectedFields(prev => ({ ...prev, reference_point: raw }));
            }
          }
        }
      }

      // 2) Risco (impacto)
      if (!collectedFields.risk_level) {
        const askedForRisk = lastAssistantLower.includes('risco imediato') || /\balgum\s+risco\b/i.test(lastAssistantText);
        if (askedForRisk && raw.length > 0) {
          let risk_level: string | null = null;
          const risk_types: string[] = [];

          if (rawLower.includes('sem risco') || rawLower.includes('não tem risco')) {
            risk_level = 'none';
          } else if (
            rawLower.includes('fios') || rawLower.includes('choque') || rawLower.includes('incênd') || rawLower.includes('fogo') ||
            rawLower.includes('alag') || rawLower.includes('inund') || rawLower.includes('desab') || rawLower.includes('desmor')
          ) {
            risk_level = 'critical';
            if (rawLower.includes('fios') || rawLower.includes('choque')) risk_types.push('electrical');
            if (rawLower.includes('alag') || rawLower.includes('inund')) risk_types.push('flooding');
            if (rawLower.includes('desab') || rawLower.includes('desmor')) risk_types.push('structural');
            if (rawLower.includes('incênd') || rawLower.includes('fogo')) risk_types.push('fire');
          } else if (rawLower.includes('acident') || rawLower.includes('trânsit') || rawLower.includes('bloquead')) {
            risk_level = 'moderate';
            risk_types.push('traffic');
          } else if (rawLower.includes('incômod') || rawLower.includes('desconfort')) {
            risk_level = 'low';
          }

          if (risk_level) {
            setCollectedFields(prev => ({
              ...prev,
              risk_level,
              ...(risk_types.length ? { risk_types } : {}),
            }));
          }
        }
      }

      // 3) Afetação / Escopo
      if (!collectedFields.affected_scope) {
        const askedForScope = lastAssistantLower.includes('isso está afetando') || lastAssistantLower.includes('toda a rua') || lastAssistantLower.includes('bairro todo') || lastAssistantLower.includes('[field_request:affected_scope]');
        if (askedForScope && raw.length > 0) {
          let affected_scope: string | null = null;
          if (rawLower.includes('só eu') || rawLower.includes('apenas eu') || rawLower.includes('somente eu')) affected_scope = 'individual';
          else if (rawLower.includes('rua')) affected_scope = 'street';
          else if (rawLower.includes('bairro')) affected_scope = 'neighborhood';
          else if (rawLower.includes('zona')) affected_scope = 'zone';
          else if (rawLower.includes('cidade')) affected_scope = 'city';

          if (affected_scope) {
            setCollectedFields(prev => ({ ...prev, affected_scope }));
          }
        }
      }
      
      // 4) Descrição - detecta resposta a pedido de detalhes
      if (!collectedFields.description) {
        const askedForDescription = 
          lastAssistantLower.includes('me conte mais') || 
          lastAssistantLower.includes('descreva') ||
          lastAssistantLower.includes('mais detalhes') ||
          lastAssistantLower.includes('o que está acontecendo') ||
          lastAssistantLower.includes('qual o problema') ||
          lastAssistantLower.includes('[field_request:description]');
          
        if (askedForDescription && raw.length >= 30) {
          setCollectedFields(prev => ({ ...prev, description: raw }));
        }
      }
    }

    // Verifica se já existe uma mensagem otimista com o mesmo conteúdo
    const hasOptimisticMessage = messages.some(
      msg => msg.role === "user" && msg.content === content
    );

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Só adiciona se não houver mensagem otimista
    if (!hasOptimisticMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }
    setIsLoading(true);

    // Save user message to database
    if (conversationIdRef.current && user) {
      try {
        const { data: currentConv } = await supabase
          .from('ai_conversations')
          .select('messages, title')
          .eq('id', conversationIdRef.current)
          .single();

        if (currentConv) {
          const updatedMessages = [...((currentConv.messages as any[]) || []), userMessage];
          
          await supabase
            .from('ai_conversations')
            .update({
              messages: updatedMessages,
              last_message_at: new Date().toISOString(),
              title: currentConv.title || content.slice(0, 50),
            })
            .eq('id', conversationIdRef.current);
        }
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload = {
        messages: [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        conversationId: conversationIdRef.current,
      };

      // Always call the unified orchestrator
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
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
        throw new Error("Erro ao processar mensagem");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let assistantMessageId = crypto.randomUUID();
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
            
            // Check for collection progress markers (robust parsing)
            const progressRegex = /\[COLLECTION_PROGRESS:(\w+):(\{[^\]]*\})\]/g;
            let progressMatch;
            while ((progressMatch = progressRegex.exec(assistantMessage)) !== null) {
              const type = progressMatch[1] as CollectionType;
              try {
                const fields = JSON.parse(progressMatch[2]);
                console.log('[useUnifiedAIChat] Collection progress detected:', type, fields);
                setCollectionType(type);
                setCollectedFields(prev => ({ ...prev, ...fields }));
              } catch (e) {
                console.warn('[useUnifiedAIChat] Failed to parse collection progress:', progressMatch[2], e);
              }
            }
            
            // FIELD_REQUEST markers are primarily used by the backend for deterministic parsing.
            // The UI tracker updates via COLLECTION_PROGRESS and local heuristics on user send.

            // Check for report markers
            // Check for report markers - keep tracker visible, just mark as created
            const urbanMatch = assistantMessage.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
            if (urbanMatch && !createdReport) {
              setCreatedReport({ type: 'urban_report', id: urbanMatch[1] });
              // Don't hide tracker - keep it visible after creation
              // Clear tracker from sessionStorage on completion
              const storageKey = getTrackerStorageKey(conversationIdRef.current);
              if (storageKey) sessionStorage.removeItem(storageKey);
              // Toast removed - agent message already confirms creation
            }
            
            const transportMatch = assistantMessage.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
            if (transportMatch && !createdReport) {
              setCreatedReport({ type: 'transport', id: transportMatch[1] });
              const storageKey = getTrackerStorageKey(conversationIdRef.current);
              if (storageKey) sessionStorage.removeItem(storageKey);
            }
            
            const ratingMatch = assistantMessage.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
            if (ratingMatch && !createdReport) {
              setCreatedReport({ type: 'rating', id: ratingMatch[1] });
              const storageKey = getTrackerStorageKey(conversationIdRef.current);
              if (storageKey) sessionStorage.removeItem(storageKey);
            }
            
            // Remove all markers from displayed message (robust regex)
            const displayMessage = assistantMessage
              .replace(/\[REPORT_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[TRANSPORT_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[RATING_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[COLLECTION_PROGRESS:\w+:\{[^\]]*\}\]/g, '')
              .replace(/\[FIELD_REQUEST:\w+\]/g, '') // Remove FIELD_REQUEST markers
              .trim();
            
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === "assistant" && lastMsg.id === assistantMessageId) {
                return prev.slice(0, -1).concat({
                  ...lastMsg,
                  content: displayMessage,
                });
              }
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: displayMessage,
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

      // Save assistant response
      if (conversationIdRef.current && user && assistantMessage) {
        try {
          const { data: currentConv } = await supabase
            .from('ai_conversations')
            .select('messages')
            .eq('id', conversationIdRef.current)
            .single();

          if (currentConv) {
            const finalAssistantMsg = {
              id: assistantMessageId,
              role: "assistant",
              content: sanitizeMessageContent(assistantMessage),
              timestamp: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              source: "Assistente Câmara na Mão",
            };

            const updatedMessages = [...((currentConv.messages as any[]) || []), finalAssistantMsg];
            
            await supabase
              .from('ai_conversations')
              .update({
                messages: updatedMessages,
                last_message_at: new Date().toISOString(),
              })
              .eq('id', conversationIdRef.current);
          }
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, user, toast, createdReport, collectionType, collectedFields]);

  const clearMessages = useCallback((preserveCollectionType = false) => {
    setMessages([]);
    setCreatedReport(null);
    if (!preserveCollectionType) {
      setCollectionType(null);
      setCollectedFields({});
      // Clear tracker from sessionStorage
      const storageKey = getTrackerStorageKey(conversationIdRef.current);
      if (storageKey) sessionStorage.removeItem(storageKey);
    }
    conversationIdRef.current = null;
  }, []);

  const addAssistantMessage = (content: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      source: "Assistente Câmara na Mão",
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Calculate missing required fields for current collection
  const getMissingRequiredFields = useCallback((): string[] => {
    if (!collectionType) return [];
    
    // Import would cause circular dependency, so inline the logic
    const RISK_CATEGORIES = ['via_publica', 'iluminacao', 'esgoto', 'area_verde'];
    
    const configs: Record<string, { key: string; required: boolean; requiredFor?: string[]; requiredWhen?: { field: string; values: string[] } }[]> = {
      urban_report: [
        { key: 'category', required: true },
        { key: 'description', required: true },
        { key: 'street', required: true },
        { key: 'neighborhood', required: true },
        { key: 'risk_level', required: false, requiredFor: RISK_CATEGORIES },
        { key: 'affected_scope', required: false, requiredWhen: { field: 'risk_level', values: ['critical', 'moderate'] } },
      ],
      transport_report: [
        { key: 'report_type', required: true },
        { key: 'description', required: true },
        { key: 'occurrence_date', required: true },
      ],
      service_rating: [
        { key: 'service_type', required: true },
        { key: 'service_name', required: true },
        { key: 'rating_stars', required: true },
        { key: 'rating_text', required: true },
      ]
    };
    
    const fields = configs[collectionType];
    if (!fields) return [];
    
    const category = collectedFields.category;
    const missing: string[] = [];
    
    for (const field of fields) {
      if (collectedFields[field.key]) continue;
      
      let isRequired = field.required;
      
      // Check conditional requirements (requiredFor)
      if (!isRequired && field.requiredFor && category) {
        isRequired = field.requiredFor.includes(category);
      }
      
      // Check conditional requirements (requiredWhen)
      if (!isRequired && field.requiredWhen) {
        const dependentValue = collectedFields[field.requiredWhen.field];
        if (dependentValue && field.requiredWhen.values.includes(dependentValue)) {
          isRequired = true;
        }
      }
      
      if (isRequired) {
        missing.push(field.key);
      }
    }
    
    return missing;
  }, [collectionType, collectedFields]);

  const isCollectionComplete = useMemo(() => {
    return getMissingRequiredFields().length === 0;
  }, [getMissingRequiredFields]);

  return {
    messages,
    isLoading,
    isHistoryLoaded,
    sendMessage,
    clearMessages,
    addAssistantMessage,
    addOptimisticMessage,
    createdReport,
    clearCreatedReport,
    collectionType,
    collectedFields,
    getMissingRequiredFields,
    isCollectionComplete,
  };
};
