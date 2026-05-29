import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUnifiedAIChat, type EvaluationContext } from "@/hooks/useUnifiedAIChat";
import {
  aggregateServiceRatingStars,
  isCompleteServiceRatingDimensions,
  parseRatingDimensionsFromMessage,
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
} from "@/lib/serviceRatingDimensions";
import { shouldOfferRatingCommentReview } from "@/lib/shouldOfferRatingCommentReview";
import { conversationUsesDimensionOnlyRating } from "@/lib/serviceRatingFlow";
import ChatMessageBubble from "@/components/ai/ChatMessageBubble";
import ChatInput from "@/components/ai/ChatInput";
import TypingIndicator from "@/components/ai/TypingIndicator";
import { useProfile } from "@/hooks/useProfile";
import { CheckCircle2, Pencil } from "lucide-react";

interface ConversationalEvaluationProps {
  /** Contexto da visita para pular coleta de serviço. Se null, modo livre (pede tipo/nome do serviço). */
  evaluationContext: EvaluationContext | null;
  /** Chamado quando a avaliação for registrada (RATING_CREATED) */
  onComplete: (data: {
    rating: number;
    comments: string;
    sentiment?: string;
  }) => void;
  /** Após sucesso: esconde envio e evita redirecionamento automático (controlado pelo pai). */
  completed?: boolean;
}

export function ConversationalEvaluation({
  evaluationContext,
  onComplete,
  completed = false,
}: ConversationalEvaluationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCompletedRef = useRef(false);
  const hasAutoStartedRef = useRef(false);
  const { profile, getInitials } = useProfile();
  const [pendingCommentReview, setPendingCommentReview] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  /** Limpa o ChatInput após enviar pelo painel de revisão (o campo ainda tinha o texto porque não limpamos no intercept). */
  const [chatInputResetKey, setChatInputResetKey] = useState(0);

  const {
    messages,
    isLoading,
    sendMessage,
    createdReport,
    collectedFields,
    handleRatingSelected,
    handleWaitTimeSelected,
    handleDimensionRatingSelected,
    handleRatingDimensionWaitTimeSelected,
    handleMultiDimensionRatingComplete,
    handleServiceSelected,
    handleServiceTypeSelected,
    handleServiceAddressConfirmed,
    patchMessageContent,
  } = useUnifiedAIChat(
    null,
    "service_rating",
    evaluationContext
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const isInApp = typeof window !== "undefined" && !!(window as unknown as { __CAMARA_IN_APP__?: boolean }).__CAMARA_IN_APP__;

  // No app: blur em sequência para garantir que o campo de avaliação não fique focado
  useEffect(() => {
    if (!isInApp) return;
    const delays = [100, 400, 800, 1200, 1800, 2500, 3200];
    const timers = delays.map((ms) =>
      setTimeout(() => {
        try {
          const el = document.activeElement;
          if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && typeof (el as HTMLTextAreaElement).blur === "function") {
            (el as HTMLTextAreaElement).blur();
          }
        } catch {
          // ignore
        }
      }, ms)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [isInApp]);

  useEffect(() => {
    if (createdReport?.type === "rating" && createdReport.id && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const dimsFromChat = [...messages]
        .reverse()
        .map((m) => (m.role === "user" ? parseRatingDimensionsFromMessage(m.content || "") : null))
        .find(Boolean);
      const ratingMatch = messages
        .flatMap((m) => (m.content || "").match(/\[RATING_SELECTED:(\d)\]/g) || [])
        .pop();
      const stars = dimsFromChat
        ? aggregateServiceRatingStars(dimsFromChat)
        : ratingMatch
          ? parseInt(ratingMatch.replace(/\[RATING_SELECTED:(\d)\]/, "$1"), 10)
          : 4;
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

  const handleSend = useCallback(
    (content: string): void | boolean => {
      const trimmed = content.trim();
      if (!trimmed || isLoading || completed) return;
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
      if (
        shouldOfferRatingCommentReview(collectedFields as Record<string, unknown>, lastAssistant, trimmed)
      ) {
        setPendingCommentReview(trimmed);
        setReviewText(trimmed);
        return false;
      }
      sendMessage(trimmed);
    },
    [isLoading, completed, messages, collectedFields, sendMessage],
  );

  const confirmReviewedComment = () => {
    const t = reviewText.trim();
    if (t.length < 5 || isLoading) return;
    setPendingCommentReview(null);
    setChatInputResetKey((k) => k + 1);
    sendMessage(t);
  };

  const cancelCommentReview = () => {
    setPendingCommentReview(null);
    setReviewText("");
  };

  const userAvatarUrl = profile?.avatar_url;
  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "?";
  const suppressLegacyStarRating = conversationUsesDimensionOnlyRating(messages);

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {messages.map((msg, idx) => {
            const lastAssistantIdx = messages.reduce((acc, m, i) => (m.role === 'assistant' ? i : acc), -1);
            const isLastAssistant = msg.role === 'assistant' && idx === lastAssistantIdx;
            return (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                userAvatarUrl={userAvatarUrl}
                userInitials={userInitials}
                isLastAssistantMessage={isLastAssistant}
                onRatingSelected={handleRatingSelected}
                onWaitTimeSelected={handleWaitTimeSelected}
                onDimensionRatingSelected={handleDimensionRatingSelected}
                onRatingDimensionWaitTimeSelected={handleRatingDimensionWaitTimeSelected}
                onMultiDimensionRatingComplete={handleMultiDimensionRatingComplete}
                onServiceSelected={handleServiceSelected}
                onServiceTypeSelected={handleServiceTypeSelected}
                onServiceAddressConfirmed={handleServiceAddressConfirmed}
                patchMessageContent={patchMessageContent}
                onSendMessage={(text) => {
                  void sendMessage(text);
                }}
                suppressLegacyStarRating={suppressLegacyStarRating}
              />
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-border pt-2 shrink-0 space-y-3">
          {pendingCommentReview != null && !completed && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Revise antes de publicar</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confira as notas e o comentário. Depois de enviar, a avaliação será registrada.
                    </p>
                  </div>
                </div>
                {typeof collectedFields.rating_stars === "number" &&
                collectedFields.rating_stars >= 1 &&
                collectedFields.rating_stars <= 5 ? (
                  <p className="text-sm rounded-md bg-background/80 border px-3 py-2">
                    <span className="text-muted-foreground">Avaliação geral:</span>{" "}
                    <span className="font-medium">{collectedFields.rating_stars}/5</span>
                  </p>
                ) : isCompleteServiceRatingDimensions(collectedFields.rating_dimensions) ? (
                  <ul className="text-sm space-y-1 rounded-md bg-background/80 border px-3 py-2">
                    {SERVICE_RATING_DIMENSION_KEYS.map((k) => (
                      <li key={k}>
                        <span className="text-muted-foreground">{SERVICE_RATING_DIMENSION_LABELS[k]}:</span>{" "}
                        <span className="font-medium">{collectedFields.rating_dimensions![k]}/5</span>
                      </li>
                    ))}
                    <li className="pt-1 text-muted-foreground text-xs">
                      Média: {aggregateServiceRatingStars(collectedFields.rating_dimensions)} estrelas
                    </li>
                  </ul>
                ) : null}
                <div className="space-y-1.5">
                  <label htmlFor="evaluation-review-comment" className="text-xs font-medium text-foreground">
                    Comentário
                  </label>
                  <Textarea
                    id="evaluation-review-comment"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    className="resize-y min-h-[88px] text-sm"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={cancelCommentReview} disabled={isLoading}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                    Voltar e editar no chat
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={confirmReviewedComment}
                    disabled={isLoading || reviewText.trim().length < 5}
                  >
                    Confirmar e enviar avaliação
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {!completed && pendingCommentReview == null && (
            <ChatInput
              key={chatInputResetKey}
              onSendMessage={handleSend}
              disabled={isLoading}
              placeholder="Digite sua mensagem..."
              draftKey="evaluation"
              autoFocus={false}
              initialFocusLockSeconds={isInApp ? 5 : undefined}
            />
          )}
          {!completed && pendingCommentReview != null && (
            <p className="text-xs text-muted-foreground px-1">
              Use o painel acima para confirmar ou voltar ao chat.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
