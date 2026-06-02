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
  onComplete: (data: { rating: number; comments: string; sentiment?: string }) => void;
}

export const ChatEvaluation = ({ onComplete }: ChatEvaluationProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Vou te ajudar a avaliar este serviço. Que nota você daria de 1 a 5 estrelas?",
    },
  ]);
  const [input, setInput] = useState("");
  const [currentRating, setCurrentRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = rating, 2 = comments, 3 = complete
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-advance when rating is selected
  useEffect(() => {
    if (step === 1 && currentRating > 0) {
      setIsLoading(true);
      setTimeout(() => {
        const assistantMessage: Message = {
          role: "assistant",
          content:
            currentRating >= 4
              ? "Ótimo! O que você mais gostou neste serviço?"
              : currentRating >= 3
                ? "Obrigado! O que você mais gostou ou o que poderia melhorar?"
                : "Entendi. O que poderia melhorar neste serviço?",
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStep(2);
        setIsLoading(false);
      }, 500);
    }
  }, [currentRating, step]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    // Step 1: User must select rating first
    if (step === 1) {
      const assistantMessage: Message = {
        role: "assistant",
        content: "Por favor, selecione uma nota de 1 a 5 estrelas acima antes de continuar.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Step 2: User provided comments, finalize
    setTimeout(() => {
      const assistantMessage: Message = {
        role: "assistant",
        content:
          "Muito obrigado pela sua avaliação! Suas informações nos ajudam a melhorar os serviços públicos.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStep(3);
      setIsLoading(false);

      // Complete evaluation
      setTimeout(() => {
        onComplete({
          rating: currentRating,
          comments: messageText,
          sentiment: currentRating >= 4 ? "positive" : currentRating >= 3 ? "neutral" : "negative",
        });
      }, 1000);
    }, 500);
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
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

        {/* Rating Stars (visible in step 1) */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-2 py-3 border-t border-border">
            <RatingStars rating={currentRating} onRatingChange={setCurrentRating} size="lg" />
            {currentRating > 0 && (
              <p className="text-sm text-muted-foreground">
                {currentRating === 5 && "Excelente!"}
                {currentRating === 4 && "Muito bom!"}
                {currentRating === 3 && "Regular"}
                {currentRating === 2 && "Ruim"}
                {currentRating === 1 && "Péssimo"}
              </p>
            )}
          </div>
        )}

        {/* Input (visible from step 2 onwards) */}
        {step >= 2 && step < 3 && (
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
              disabled={isLoading || !input.trim()}
              size="icon"
              className="shrink-0 h-[60px]"
              aria-label="Enviar avaliação"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
