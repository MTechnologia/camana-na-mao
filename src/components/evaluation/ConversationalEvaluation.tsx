import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useUnifiedAIChat, type EvaluationContext } from "@/hooks/useUnifiedAIChat";
import ChatMessageBubble from "@/components/ai/ChatMessageBubble";
import ChatInput from "@/components/ai/ChatInput";
import TypingIndicator from "@/components/ai/TypingIndicator";
import { useProfile } from "@/hooks/useProfile";

interface ConversationalEvaluationProps {
  /** Contexto da visita para pular coleta de serviço. Se null, modo livre (pede tipo/nome do serviço). */
  evaluationContext: EvaluationContext | null;
  /** Chamado quando a avaliação for registrada (RATING_CREATED) */
  onComplete: (data: {
    rating: number;
    comments: string;
    sentiment?: string;
  }) => void;
}

export function ConversationalEvaluation({
  evaluationContext,
  onComplete,
}: ConversationalEvaluationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCompletedRef = useRef(false);
  const hasAutoStartedRef = useRef(false);
  const { profile, getInitials } = useProfile();

  const {
    messages,
    isLoading,
    sendMessage,
    createdReport,
    handleRatingSelected,
  } = useUnifiedAIChat(
    null,
    "service_rating",
    evaluationContext
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (createdReport?.type === "rating" && createdReport.id && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const ratingMatch = messages
        .flatMap((m) => (m.content || "").match(/\[RATING_SELECTED:(\d)\]/g) || [])
        .pop();
      const stars = ratingMatch ? parseInt(ratingMatch.replace(/\[RATING_SELECTED:(\d)\]/, "$1"), 10) : 4;
      onComplete({
        rating: stars,
        comments: lastUser.length >= 10 ? lastUser : "Avaliação registrada via chat.",
        sentiment: stars >= 4 ? "positive" : stars >= 3 ? "neutral" : "negative",
      });
    }
  }, [createdReport, messages, onComplete]);

  useEffect(() => {
    if (!hasAutoStartedRef.current && messages.length === 0 && evaluationContext?.service_name) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(() => {
        sendMessage(`Olá, quero avaliar o ${evaluationContext.service_name}`);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [evaluationContext?.service_name, messages.length, sendMessage]);

  const handleSend = (content: string) => {
    if (!content.trim() || isLoading) return;
    sendMessage(content.trim());
  };

  const userAvatarUrl = profile?.avatar_url;
  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "?";

  return (
    <Card className="h-[500px] flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              userAvatarUrl={userAvatarUrl}
              userInitials={userInitials}
              onRatingSelected={handleRatingSelected}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-border pt-2 shrink-0">
          <ChatInput
            onSendMessage={handleSend}
            disabled={isLoading}
            placeholder="Digite sua mensagem..."
            draftKey="evaluation"
          />
        </div>
      </CardContent>
    </Card>
  );
}
