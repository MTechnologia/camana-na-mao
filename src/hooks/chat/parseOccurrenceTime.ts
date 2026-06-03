/** Parse horário livre (transporte) para HH:mm. */
export function parseOccurrenceTime(text: string): string | null {
  const raw = text.trim().toLowerCase();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s+/g, " ")
    .replace(/horas?/g, "h")
    .replace(/\bmeia noite\b/g, "00:00")
    .replace(/\bmeio dia\b/g, "12:00")
    .replace(/\bmeio-dia\b/g, "12:00");

  const compact = normalized.replace(/\s+/g, "");
  const hmMatch = compact.match(/\b([01]?\d|2[0-3])(?:h|:)([0-5]?\d)?\b/);
  if (hmMatch) {
    const hour = hmMatch[1].padStart(2, "0");
    const minute = (hmMatch[2] || "00").padStart(2, "0");
    return `${hour}:${minute}`;
  }

  if (/^([01]\d|2[0-3])([0-5]\d)$/.test(compact)) {
    const digits = compact.match(/^([01]\d|2[0-3])([0-5]\d)$/);
    if (digits) {
      return `${digits[1]}:${digits[2]}`;
    }
  }

  const simple = compact.match(/\b([01]?\d|2[0-3])\b/);
  if (simple && /\b(h|hora)\b/.test(normalized)) {
    return `${simple[1].padStart(2, "0")}:00`;
  }

  return null;
}
