/**
 * Equipamentos com média estritamente abaixo de 2 estrelas e pelo menos uma avaliação
 * publicada (agregados em public_services refletem apenas avaliações `published`).
 */
export function needsVerificationForLowAverageRating(
  averageRating: number | null | undefined,
  totalRatings: number | null | undefined,
): boolean {
  const total = Number(totalRatings ?? 0);
  if (total < 1) return false;
  const avg = Number(averageRating ?? 0);
  return avg < 2;
}
