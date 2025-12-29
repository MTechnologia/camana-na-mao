import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";

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

export const useUnifiedAIChat = (conversationId?: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
  const [collectionType, setCollectionType] = useState<CollectionType>(null);
  const [collectedFields, setCollectedFields] = useState<CollectedFields>({});
  const conversationIdRef = useRef<string | null>(conversationId || null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Sync conversationIdRef with prop changes
  useEffect(() => {
    if (conversationId !== conversationIdRef.current) {
      conversationIdRef.current = conversationId || null;
    }
  }, [conversationId]);

  // Reset state when conversation changes
  useEffect(() => {
    setIsHistoryLoaded(false);
    setCreatedReport(null);
    setCollectionType(null);
    setCollectedFields({});
  }, [conversationId]);

  // Load messages from database when conversationId changes
  useEffect(() => {
    const loadConversationMessages = async () => {
      setMessages([]);
      
      if (!conversationId || !user) {
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
          // Add initial greeting
          const initialMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Olá! Sou o assistente do Câmara na Mão 🏛️

Posso ajudar você com:
• **Informações** sobre a Câmara, vereadores e audiências
• **Relatar problemas** urbanos ou de transporte
• **Avaliar** serviços públicos que você utilizou

Como posso ajudar?`,
            timestamp: new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            source: "Assistente Câmara na Mão",
          };
          setMessages([initialMsg]);
          
          await supabase
            .from('ai_conversations')
            .update({
              messages: [{ ...initialMsg }],
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversationId);
        } else {
          // Garante que todas as mensagens tenham timestamp (fallback para vazio)
          const messagesWithTimestamp = savedMessages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || ''
          }));
          setMessages(messagesWithTimestamp);
          
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

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
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
            
            // Check for report markers
            const urbanMatch = assistantMessage.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
            if (urbanMatch && !createdReport) {
              setCreatedReport({ type: 'urban_report', id: urbanMatch[1] });
              setCollectionType(null);
              setCollectedFields({});
              toast({
                title: "Relato criado!",
                description: "Seu relato urbano foi registrado.",
              });
            }
            
            const transportMatch = assistantMessage.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
            if (transportMatch && !createdReport) {
              setCreatedReport({ type: 'transport', id: transportMatch[1] });
              setCollectionType(null);
              setCollectedFields({});
              toast({
                title: "Relato registrado!",
                description: "Seu relato de transporte foi salvo.",
              });
            }
            
            const ratingMatch = assistantMessage.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
            if (ratingMatch && !createdReport) {
              setCreatedReport({ type: 'rating', id: ratingMatch[1] });
              setCollectionType(null);
              setCollectedFields({});
              toast({
                title: "Avaliação registrada!",
                description: "Sua avaliação foi salva.",
              });
            }
            
            // Remove all markers from displayed message (robust regex)
            const displayMessage = assistantMessage
              .replace(/\[REPORT_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[TRANSPORT_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[RATING_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[COLLECTION_PROGRESS:\w+:\{[^\]]*\}\]/g, '')
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
              content: assistantMessage,
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
  };

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCreatedReport(null);
    setCollectionType(null);
    setCollectedFields({});
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
    createdReport,
    clearCreatedReport,
    collectionType,
    collectedFields,
  };
};
