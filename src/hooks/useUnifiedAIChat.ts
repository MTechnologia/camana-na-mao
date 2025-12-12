import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { JourneyType } from "@/contexts/AIJourneyContext";
import { AI_JOURNEYS } from "@/config/aiJourneys";

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

export interface IntentDetection {
  journey: "transport" | "urban_report" | "evaluate";
  confidence: number;
}

export const useUnifiedAIChat = (journey: JourneyType | null, conversationId?: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
  const [detectedIntent, setDetectedIntent] = useState<IntentDetection | null>(null);
  const conversationIdRef = useRef<string | null>(conversationId || null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Sync conversationIdRef with prop changes imediatamente
  useEffect(() => {
    if (conversationId !== conversationIdRef.current) {
      conversationIdRef.current = conversationId || null;
    }
  }, [conversationId]);

  // Sync síncrono também para garantir
  if (conversationId && conversationId !== conversationIdRef.current) {
    conversationIdRef.current = conversationId;
  }

  // Reset createdReport when conversation changes
  useEffect(() => {
    setCreatedReport(null);
  }, [conversationId]);

  // Carregar mensagens do banco quando há conversationId
  useEffect(() => {
    const loadConversationMessages = async () => {
      // Clear old messages first
      setMessages([]);
      
      if (!conversationId || !user) return;

      try {
        const { data, error } = await supabase
          .from('ai_conversations')
          .select('messages, journey_id')
          .eq('id', conversationId)
          .single();

        if (error) throw error;

        const savedMessages = (data.messages as any[]) || [];
        
        // Determinar a jornada: usar a passada ou buscar pelo journey_id da conversa
        const effectiveJourney = journey || (data.journey_id ? AI_JOURNEYS[data.journey_id] : null);
        
        // Fallback: Se não há mensagens mas há jornada com initialMessage, adicionar
        if (savedMessages.length === 0 && effectiveJourney?.initialMessage) {
          const initialMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: effectiveJourney.initialMessage,
            timestamp: new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            source: "IA CMSP Connect",
          };
          setMessages([initialMsg]);
          
          // Salvar a mensagem inicial no banco também
          await supabase
            .from('ai_conversations')
            .update({
              messages: [{ ...initialMsg }],
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversationId);
        } else {
          setMessages(savedMessages);
          
          // Check if any message contains a report creation marker
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
        console.error('Error loading conversation messages:', error);
      }
    };

    loadConversationMessages();
  }, [conversationId, user?.id, journey?.initialMessage]);

  const addAssistantMessage = (content: string, source: string = "CMSP Connect") => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      source,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const clearCreatedReport = useCallback(() => {
    setCreatedReport(null);
  }, []);

  const dismissIntent = useCallback(() => {
    setDetectedIntent(null);
  }, []);

  const sendMessage = async (content: string) => {
    // Use fallback para jornada 'general' se nenhuma estiver ativa
    const activeJourney = journey || AI_JOURNEYS.general;
    
    // Clear previous intent when sending new message
    setDetectedIntent(null);

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

    // Salvar mensagem do usuário no banco se houver conversationId
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

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${activeJourney.edgeFunction}`,
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
            description: "Por favor, aguarde um momento antes de tentar novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos ao seu workspace para continuar usando a IA.",
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

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              
              // Check for intent detection marker from any journey (cross-journey detection)
              if (parsed.intent_detected) {
                setDetectedIntent({
                  journey: parsed.journey,
                  confidence: parsed.confidence
                });
                continue;
              }
              
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                assistantMessage += content;
                
                // Check for urban report creation marker
                const urbanMatch = assistantMessage.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
                if (urbanMatch && !createdReport) {
                  setCreatedReport({ type: 'urban_report', id: urbanMatch[1] });
                  toast({
                    title: "Relato criado!",
                    description: "Seu relato urbano foi registrado com sucesso.",
                  });
                }
                
                // Check for transport report creation marker
                const transportMatch = assistantMessage.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
                if (transportMatch && !createdReport) {
                  setCreatedReport({ type: 'transport', id: transportMatch[1] });
                  toast({
                    title: "Relato registrado!",
                    description: "Seu relato de transporte foi registrado com sucesso.",
                  });
                }
                
                // Check for rating creation marker
                const ratingMatch = assistantMessage.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
                if (ratingMatch && !createdReport) {
                  setCreatedReport({ type: 'rating', id: ratingMatch[1] });
                  toast({
                    title: "Avaliação registrada!",
                    description: "Sua avaliação foi registrada com sucesso.",
                  });
                }
                
                // Remove all markers from displayed message
                const displayMessage = assistantMessage
                  .replace(/\[REPORT_CREATED:[a-f0-9-]+\]/g, '')
                  .replace(/\[TRANSPORT_CREATED:[a-f0-9-]+\]/g, '')
                  .replace(/\[RATING_CREATED:[a-f0-9-]+\]/g, '')
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
                      source: "IA CMSP Connect",
                     },
                   ];
                 });
              }

              if (parsed.conversationId) {
                conversationIdRef.current = parsed.conversationId;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Salvar resposta da IA no banco se houver conversationId
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
              content: assistantMessage, // Save full message with marker for history
              timestamp: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              source: "IA CMSP Connect",
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
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCreatedReport(null);
    setDetectedIntent(null);
    conversationIdRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    addAssistantMessage,
    createdReport,
    clearCreatedReport,
    detectedIntent,
    dismissIntent,
  };
};
