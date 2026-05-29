/** Marcadores de protocolo do assistente (subset usado no FE). */
export const COLLECTION_PROGRESS_PREFIX = "[COLLECTION_PROGRESS:";

export type CollectionProgressChunk = { type: string; jsonStr: string };

/**
 * Extrai cada payload JSON dos marcadores `[COLLECTION_PROGRESS:type:{...}]`.
 * Usa profundidade de chaves ignorando `{`/`}` dentro de strings JSON.
 */
export function extractCollectionProgressJsonObjects(text: string): CollectionProgressChunk[] {
  const results: CollectionProgressChunk[] = [];
  let pos = 0;
  while (pos < text.length) {
    const start = text.indexOf(COLLECTION_PROGRESS_PREFIX, pos);
    if (start === -1) break;
    const typeStart = start + COLLECTION_PROGRESS_PREFIX.length;
    const colonIdx = text.indexOf(":", typeStart);
    if (colonIdx === -1) break;
    const type = text.slice(typeStart, colonIdx);
    if (!/^\w+$/.test(type)) {
      pos = typeStart;
      continue;
    }
    const braceStart = text.indexOf("{", colonIdx);
    if (braceStart === -1) break;
    let depth = 0;
    let inString = false;
    let escape = false;
    let i = braceStart;
    let closed = false;
    for (; i < text.length; i++) {
      const c = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c === "\\") {
          escape = true;
          continue;
        }
        if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          closed = true;
          break;
        }
      }
    }
    if (!closed) break;
    const jsonStr = text.slice(braceStart, i + 1);
    if (text[i + 1] === "]") {
      results.push({ type, jsonStr });
    }
    pos = i + 2;
  }
  return results;
}

/** Último progresso de coleta encontrado no texto (para preview de conversas). */
export function parseLatestCollectionProgressFields(
  content: string,
): { type: string; fields: Record<string, unknown> } | null {
  const chunks = extractCollectionProgressJsonObjects(content);
  if (chunks.length === 0) return null;
  const last = chunks[chunks.length - 1];
  try {
    const fields = JSON.parse(last.jsonStr) as Record<string, unknown>;
    if (!fields || typeof fields !== "object") return null;
    return { type: last.type, fields };
  } catch {
    return null;
  }
}
