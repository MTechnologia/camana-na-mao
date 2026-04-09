/**
 * Decodifica o marcador [TRANSPORT_PREVIEW_JSON:base64] enviado pelo ai-orchestrator (HU-5.6).
 */
export type ParsedTransportReportPreview = {
  description: string | null;
  report_type: string | null;
  line_code: string | null;
  occurrence_date: string | null;
  occurrence_time: string | null;
  direction: string | null;
  recurrence_frequency: string | null;
  personal_impact: number | null;
  location: string | null;
};

export function parseTransportReportPreviewJson(content: string): ParsedTransportReportPreview | null {
  const m = content.match(/\[TRANSPORT_PREVIEW_JSON:([A-Za-z0-9+/=_-]+)\]/);
  if (!m?.[1]) return null;
  try {
    const json = decodeURIComponent(escape(atob(m[1])));
    const data = JSON.parse(json) as Record<string, unknown>;
    const num = data.personal_impact;
    return {
      description: typeof data.description === "string" ? data.description : null,
      report_type: typeof data.report_type === "string" ? data.report_type : null,
      line_code: typeof data.line_code === "string" ? data.line_code : null,
      occurrence_date: typeof data.occurrence_date === "string" ? data.occurrence_date : null,
      occurrence_time: typeof data.occurrence_time === "string" ? data.occurrence_time : null,
      direction: typeof data.direction === "string" ? data.direction : null,
      recurrence_frequency: typeof data.recurrence_frequency === "string" ? data.recurrence_frequency : null,
      personal_impact: typeof num === "number" && Number.isFinite(num) ? num : null,
      location: typeof data.location === "string" ? data.location : null,
    };
  } catch {
    return null;
  }
}

export function stripTransportPreviewJsonMarker(content: string): string {
  return content.replace(/\s*\[TRANSPORT_PREVIEW_JSON:[^\]]+\]\s*/g, "").trim();
}

/**
 * Remove marcador [LINE_SELECTED:…] e omite texto que é só rótulo de linha (legado gravado em `description`).
 */
export function formatTransportReportDescriptionForDisplay(raw: string | null | undefined): string | undefined {
  if (raw == null || String(raw).trim() === "") return undefined;
  const s = String(raw)
    .replace(/\s*\[LINE_SELECTED:[^\]]+\]\s*/gi, "")
    .trim();
  if (!s) return undefined;
  const wordCount = s.split(/\s+/).filter(Boolean).length;
  if (/^linha:\s*\S+/i.test(s) && wordCount <= 14 && !/[.!?…]/.test(s)) {
    return undefined;
  }
  return s;
}
