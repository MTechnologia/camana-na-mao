import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AIAvatar from '@/components/ai/AIAvatar';
import { cn } from '@/lib/utils';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  options?: string[];
}

interface ChatTransportDiagnosisProps {
  onComplete: (data: any) => void;
  initialData?: {
    line_code?: string;
    line_name?: string;
    report_type?: string;
  };
}

export const ChatTransportDiagnosis = ({ onComplete, initialData }: ChatTransportDiagnosisProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: initialData?.line_code 
        ? `Ótimo! Você selecionou a linha ${initialData.line_code}${initialData.line_name ? ` - ${initialData.line_name}` : ''}. Que tipo de problema você enfrentou?`
        : 'Olá! Vou te ajudar a relatar um problema no transporte. Para começar, qual linha de ônibus ou metrô você utilizou?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('diagnose-transport', {
        body: { 
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          action: 'chat'
        }
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          toast({
            variant: 'destructive',
            title: 'Limite de requisições excedido',
            description: 'Por favor, aguarde alguns minutos e tente novamente.',
          });
        } else if (error.message?.includes('402') || error.message?.includes('credits')) {
          toast({
            variant: 'destructive',
            title: 'Créditos insuficientes',
            description: 'Adicione créditos na sua workspace do Lovable.',
          });
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      const aiResponse: Message = {
        role: 'assistant',
        content: data.message,
      };
      setMessages(prev => [...prev, aiResponse]);

      // Após algumas trocas de mensagens, tentar analisar
      if (messages.length >= 6) {
        const { data: classificationData, error: classError } = await supabase.functions.invoke('diagnose-transport', {
          body: { 
            messages: [...messages, userMessage, aiResponse].map(m => ({ role: m.role, content: m.content })),
            action: 'analyze'
          }
        });

        if (!classError && classificationData?.classification) {
          onComplete({
            ...initialData,
            ...classificationData.classification,
            conversation: [...messages, userMessage, aiResponse]
          });
        }
      }
    } catch (err) {
      console.error('Error calling diagnose-transport:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar mensagem',
        description: 'Tente novamente em alguns instantes.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && <AIAvatar />}
              
              <div className={cn(
                'max-w-[80%] rounded-2xl p-4',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}>
                <p className="text-sm">{message.content}</p>
                
                {message.options && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.options.map((option, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="outline"
                        onClick={() => handleSend(option)}
                        className="text-xs"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-3">
            <AIAvatar />
            <div className="bg-muted rounded-2xl p-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite sua mensagem..."
            className="min-h-[60px] resize-none"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-[60px] w-[60px] rounded-xl"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
