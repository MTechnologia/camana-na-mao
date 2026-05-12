export function normalizeServiceRatingNeighborhood(raw: unknown): string {
  const text = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return "";

  const parts = text.split(/\s+/);
  const deduped: string[] = [];
  for (const part of parts) {
    if (deduped.length && deduped[deduped.length - 1].toLowerCase() === part.toLowerCase()) continue;
    deduped.push(part);
  }
  return deduped.join(" ");
}
