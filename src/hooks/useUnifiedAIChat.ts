import { useState, useRef, useEffect, useCallback } from "react";
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
            
            // Check for FIELD_REQUEST markers and extract from previous user message
            const fieldRequestMatch = assistantMessage.match(/\[FIELD_REQUEST:(\w+)\]/);
            if (fieldRequestMatch) {
              const requestedField = fieldRequestMatch[1];
              // If assistant asked for street_number in previous turn and user just replied,
              // we need to extract from the messages history
              if (requestedField === 'street_number') {
                // Look at the last user message (current one being processed)
                const lastUserMsg = messages.filter(m => m.role === 'user').pop();
                if (lastUserMsg) {
                  // Extract number from user's response (e.g., "123", "s/n", "sem número")
                  const numberMatch = lastUserMsg.content.match(/^(\d+[A-Za-z]?|s\/?n|sem\s*n[úu]mero)$/i) ||
                    lastUserMsg.content.match(/n[úu]mero\s*[:\s]*(\d+[A-Za-z]?)/i) ||
                    lastUserMsg.content.match(/^(\d+)\b/);
                  if (numberMatch) {
                    const extractedNumber = numberMatch[1] || numberMatch[0];
                    console.log('[useUnifiedAIChat] Extracted street_number:', extractedNumber);
                    setCollectedFields(prev => ({ ...prev, street_number: extractedNumber }));
                  }
                }
              }
            }
            
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
  }, [messages, user, toast, createdReport]);

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
  };
};
