import {
  SERVICE_RATING_DIMENSION_KEYS,
  isCompleteServiceRatingDimensions,
  type ServiceRatingDimensions,
} from "@/lib/serviceRatingDimensions";

/**
 * HU-8.1: quando sugerir encaminhamento a vereador após avaliação (nota geral ≤ 2 ou alguma dimensão ≤ 2).
 * Alinhado a `shouldOfferServiceRatingReferral` no orchestrator — não confundir com
 * `shouldOfferRatingCommentReview` (revisão de comentário no fluxo conversacional).
 */
export function shouldOfferRatingReferral(
  ratingStars: number,
  ratingDimensions: unknown,
): boolean {
  if (Number.isInteger(ratingStars) && ratingStars >= 1 && ratingStars <= 2) return true;
  if (!ratingDimensions || typeof ratingDimensions !== "object") return false;
  if (!isCompleteServiceRatingDimensions(ratingDimensions)) return false;
  const rd = ratingDimensions as ServiceRatingDimensions;
  for (const k of SERVICE_RATING_DIMENSION_KEYS) {
    const n = rd[k];
    if (Number.isInteger(n) && n >= 1 && n <= 2) return true;
  }
  return false;
}
