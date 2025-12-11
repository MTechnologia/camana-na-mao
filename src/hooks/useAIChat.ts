import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  source?: string;
}

interface IntentDetection {
  journey: "transport" | "urban_report" | "evaluate";
  confidence: number;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedIntent, setDetectedIntent] = useState<IntentDetection | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const dismissIntent = useCallback(() => {
    setDetectedIntent(null);
  }, []);

  const sendMessage = async (content: string) => {
    // Clear any previous intent when sending new message
    setDetectedIntent(null);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Call AI chat function with streaming
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            conversationId: conversationIdRef.current
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar resposta');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId = (Date.now() + 1).toString();

      if (!reader) {
        throw new Error('Resposta inválida do servidor');
      }

      // Add assistant message placeholder
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: '',
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        source: "IA CMSP Connect",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      let buffer = '';
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          
          // Process SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              // Check for intent detection marker
              if (parsed.intent_detected) {
                setDetectedIntent({
                  journey: parsed.journey,
                  confidence: parsed.confidence
                });
                continue;
              }
              
              const delta = parsed.choices?.[0]?.delta?.content;
              
              if (delta) {
                assistantContent += delta;
                setMessages((prev) => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      if (!assistantContent) {
        throw new Error('Nenhuma resposta recebida da IA');
      }

    } catch (error) {
      console.error('Erro no chat:', error);
      toast({
        title: "Erro",
        description: (error as Error).message || "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
      
      // Remove last message if error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = useCallback(() => {
    setMessages([]);
    setDetectedIntent(null);
    conversationIdRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    detectedIntent,
    dismissIntent,
  };
};
