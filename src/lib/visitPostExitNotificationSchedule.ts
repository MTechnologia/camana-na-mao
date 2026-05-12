/**
 * Espelha a regra SQL do trigger `schedule_post_visit_rating_notification`:
 * agenda push em departed_at + 15 min só se ainda houver janela de avaliação antes desse instante.
 * Janela = min(expires_at, created_at + 48h) — alinhado a RN-AVA-002 / visitHistoryStatus.
 */
export function shouldSchedulePostExitRatingPush(params: {
  departedAt: Date;
  createdAt: Date;
  expiresAt: Date;
}): boolean {
  const sendAt = new Date(params.departedAt.getTime() + 15 * 60 * 1000);
  const ratingDeadline = new Date(
    Math.min(
      params.expiresAt.getTime(),
      params.createdAt.getTime() + 48 * 60 * 60 * 1000,
    ),
  );
  return sendAt.getTime() < ratingDeadline.getTime();
}
