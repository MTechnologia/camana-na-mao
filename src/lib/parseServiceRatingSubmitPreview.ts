/**
 * Decodifica marcadores de preview de avaliação enviados pelo ai-orchestrator.
 * Formatos aceitos:
 * - [RATING_SUBMIT_PREVIEW_JSON:base64] (legado)
 * - [RATING_PREVIEW:{...}] (escopo 5319543)
 */
export type ParsedServiceRatingSubmitPreview = {
  rating_stars: number;
  rating_dimensions: Record<string, number> | null;
  service_name: string;
  comment_preview: string;
};

function normalizePreviewPayload(data: Record<string, unknown>): ParsedServiceRatingSubmitPreview {
  const starsRaw = data.rating_stars;
  let rating_stars = 0;
  if (typeof starsRaw === "number" && Number.isFinite(starsRaw)) {
    rating_stars = Math.round(starsRaw);
  } else if (starsRaw != null && String(starsRaw).trim() !== "") {
    const p = parseInt(String(starsRaw), 10);
    if (Number.isFinite(p)) rating_stars = p;
  }
  let rating_dimensions: Record<string, number> | null = null;
  if (data.rating_dimensions && typeof data.rating_dimensions === "object" && !Array.isArray(data.rating_dimensions)) {
    rating_dimensions = data.rating_dimensions as Record<string, number>;
  }
  return {
    rating_stars,
    rating_dimensions,
    service_name: typeof data.service_name === "string" ? data.service_name : "",
    comment_preview: typeof data.comment_preview === "string" ? data.comment_preview : "",
  };
}

function extractRatingPreviewInlineJson(content: string): string | null {
  const startTag = "[RATING_PREVIEW:";
  const start = content.indexOf(startTag);
  if (start === -1) return null;
  const jsonStart = content.indexOf("{", start + startTag.length);
  if (jsonStart === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < content.length; i++) {
    const c = content[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        const bracket = content.indexOf("]", i + 1);
        if (bracket === -1) return null;
        return content.slice(jsonStart, i + 1);
      }
    }
  }
  return null;
}

export function parseServiceRatingSubmitPreviewJson(content: string): ParsedServiceRatingSubmitPreview | null {
  const b64Match = content.match(/\[RATING_SUBMIT_PREVIEW_JSON:([A-Za-z0-9+/=_-]+)\]/);
  if (b64Match?.[1]) {
    try {
      const json = decodeURIComponent(escape(atob(b64Match[1])));
      const data = JSON.parse(json) as Record<string, unknown>;
      return normalizePreviewPayload(data);
    } catch {
      // fallback to inline marker parser
    }
  }
  const inlineJson = extractRatingPreviewInlineJson(content);
  if (!inlineJson) return null;
  try {
    const data = JSON.parse(inlineJson) as Record<string, unknown>;
    return normalizePreviewPayload(data);
  } catch {
    return null;
  }
}

export function stripServiceRatingSubmitPreviewJsonMarker(content: string): string {
  return content
    .replace(/\s*\[RATING_SUBMIT_PREVIEW_JSON:[^\]]+\]\s*/g, "")
    .replace(/\s*\[RATING_PREVIEW:\{[\s\S]*?\}\]\s*/g, "")
    .trim();
}

/** Remove o bloco markdown duplicado quando o card estruturado já mostra o resumo. */
export function stripRatingSubmitPreviewDuplicateMarkdown(content: string): string {
  let s = stripServiceRatingSubmitPreviewJsonMarker(content);
  s = s.replace(/\*\*Resumo da avaliação\*\*[\s\S]*?\[QUICK_REPLY:[^\]]+\]/gi, "").trim();
  return s;
}
