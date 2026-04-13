import { isCompleteServiceRatingDimensions } from "@/lib/serviceRatingDimensions";

/** Próximo passo é o comentário textual (nota já enviada; assistente pediu experiência). */
export function shouldOfferRatingCommentReview(
  collectedFields: Record<string, unknown>,
  lastAssistantContent: string,
  draft: string,
): boolean {
  const rs = collectedFields.rating_stars;
  const hasGeneral =
    typeof rs === "number" && Number.isInteger(rs) && rs >= 1 && rs <= 5;
  if (!hasGeneral && !isCompleteServiceRatingDimensions(collectedFields.rating_dimensions)) return false;
  if (collectedFields.rating_text) return false;
  const a = lastAssistantContent.toLowerCase();
  const asked =
    a.includes("experiência") ||
    a.includes("experiencia") ||
    a.includes("comentário") ||
    a.includes("comentario") ||
    a.includes("descreva") ||
    a.includes("como foi o atendimento") ||
    a.includes("[field_request:rating_text]");
  if (!asked) return false;
  return draft.trim().length >= 5;
}
