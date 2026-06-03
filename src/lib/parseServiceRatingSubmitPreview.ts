/**
 * Decodifica o marcador [RATING_SUBMIT_PREVIEW_JSON:base64] enviado pelo ai-orchestrator (OS-06 / HU-1.6).
 */
export type ParsedServiceRatingSubmitPreview = {
  rating_stars: number;
  rating_dimensions: Record<string, number> | null;
  service_name: string;
  comment_preview: string;
};

export function parseServiceRatingSubmitPreviewJson(
  content: string,
): ParsedServiceRatingSubmitPreview | null {
  const m = content.match(/\[RATING_SUBMIT_PREVIEW_JSON:([A-Za-z0-9+/=_-]+)\]/);
  if (!m?.[1]) return null;
  try {
    const json = decodeURIComponent(escape(atob(m[1])));
    const data = JSON.parse(json) as Record<string, unknown>;
    const starsRaw = data.rating_stars;
    let rating_stars = 0;
    if (typeof starsRaw === "number" && Number.isFinite(starsRaw)) {
      rating_stars = Math.round(starsRaw);
    } else if (starsRaw != null && String(starsRaw).trim() !== "") {
      const p = parseInt(String(starsRaw), 10);
      if (Number.isFinite(p)) rating_stars = p;
    }
    let rating_dimensions: Record<string, number> | null = null;
    if (
      data.rating_dimensions &&
      typeof data.rating_dimensions === "object" &&
      !Array.isArray(data.rating_dimensions)
    ) {
      rating_dimensions = data.rating_dimensions as Record<string, number>;
    }
    return {
      rating_stars: rating_stars,
      rating_dimensions,
      service_name: typeof data.service_name === "string" ? data.service_name : "",
      comment_preview: typeof data.comment_preview === "string" ? data.comment_preview : "",
    };
  } catch {
    return null;
  }
}

export function stripServiceRatingSubmitPreviewJsonMarker(content: string): string {
  return content.replace(/\s*\[RATING_SUBMIT_PREVIEW_JSON:[^\]]+\]\s*/g, "").trim();
}

/** Remove o bloco markdown duplicado quando o card estruturado já mostra o resumo. */
export function stripRatingSubmitPreviewDuplicateMarkdown(content: string): string {
  let s = stripServiceRatingSubmitPreviewJsonMarker(content);
  s = s.replace(/\*\*Resumo da avaliação\*\*[\s\S]*?\[QUICK_REPLY:[^\]]+\]/gi, "").trim();
  return s;
}
