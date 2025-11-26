import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "./RatingStars";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "assistant" | "user";
  content: string;
  rating?: number;
  options?: string[];
}

interface ChatEvaluationProps {
  onComplete: (data: {
    rating: number;
    comments: string;
    sentiment?: string;
  }) => void;
}

export const ChatEvaluation = ({ onComplete }: ChatEvaluationProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Vou te ajudar a avaliar este serviço. Como foi sua experiência geral?",
      options: ["Excelente", "Boa", "Regular", "Ruim", "Péssima"]
    }
  ]);
  const [input, setInput] = useState("");
  const [currentRating, setCurrentRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: messageText
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simular fluxo de avaliação
    setTimeout(() => {
      let assistantMessage: Message;

      if (step === 1) {
        // Primeira pergunta sobre rating
        assistantMessage = {
          role: "assistant",
          content: "Ótimo! Agora, que nota você daria de 1 a 5 estrelas?"
        };
        setStep(2);
      } else if (step === 2 && currentRating > 0) {
        // Segunda pergunta sobre aspectos específicos
        assistantMessage = {
          role: "assistant",
          content: "Obrigado! O que você mais gostou ou o que poderia melhorar?",
        };
        setStep(3);
      } else if (step === 3) {
        // Finalizar
        assistantMessage = {
          role: "assistant",
          content: "Muito obrigado pela sua avaliação! Suas informações nos ajudam a melhorar os serviços públicos."
        };
        setStep(4);
        
        // Completar avaliação
        setTimeout(() => {
          onComplete({
            rating: currentRating,
            comments: messageText,
            sentiment: currentRating >= 4 ? "positive" : currentRating >= 3 ? "neutral" : "negative"
          });
        }, 1000);
      } else {
        assistantMessage = {
          role: "assistant",
          content: "Por favor, avalie com as estrelas acima antes de continuar."
        };
      }

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                <p className="text-sm">{message.content}</p>
                
                {message.options && (
                  <div className="flex flex-wrap gap-2 mt-2">
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
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary text-secondary-foreground rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Rating Stars (visible no step 2) */}
        {step === 2 && (
          <div className="flex justify-center py-2 border-t border-border">
            <RatingStars
              rating={currentRating}
              onRatingChange={setCurrentRating}
              size="lg"
            />
          </div>
        )}

        {/* Input */}
        {step < 4 && (
          <div className="flex gap-2 border-t border-border pt-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua mensagem..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && step !== 2)}
              size="icon"
              className="shrink-0 h-[60px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
