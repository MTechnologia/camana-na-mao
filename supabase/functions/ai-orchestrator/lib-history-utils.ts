export type HistoryMessageLike = { role: string; content: string | unknown };

export const COLLECTION_PROGRESS_PREFIX = "[COLLECTION_PROGRESS:";

export function getHistoryMessageText(msg: HistoryMessageLike): string {
  const raw = msg.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const part = raw.find((piece: Record<string, unknown>) => piece?.type === "text" && piece?.text);
    return part ? String((part as { text?: string }).text) : "";
  }
  return "";
}

export function stripCollectionProgressMarkersFromAssistantText(text: string): string {
  const spans: Array<{ start: number; endExclusive: number }> = [];
  let pos = 0;
  while (pos < text.length) {
    const idx = text.indexOf(COLLECTION_PROGRESS_PREFIX, pos);
    if (idx === -1) break;
    const afterPrefix = idx + COLLECTION_PROGRESS_PREFIX.length;
    const colonAfterType = text.indexOf(":", afterPrefix);
    if (colonAfterType === -1) break;
    const jsonStart = text.indexOf("{", colonAfterType);
    if (jsonStart === -1) {
      pos = colonAfterType + 1;
      continue;
    }
    let depth = 0;
    let j = jsonStart;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    if (depth !== 0) {
      pos = idx + 1;
      continue;
    }
    if (text[j] === "]") {
      spans.push({ start: idx, endExclusive: j + 1 });
      pos = j + 1;
    } else {
      pos = j;
    }
  }
  if (!spans.length) return text;
  let out = "";
  let last = 0;
  for (const span of spans) {
    out += text.slice(last, span.start);
    last = span.endExclusive;
  }
  out += text.slice(last);
  return out;
}

export function getLastFieldRequestType(text: string): string | null {
  const stripped = stripCollectionProgressMarkersFromAssistantText(text);
  const matches = [...stripped.matchAll(/\[FIELD_REQUEST:(\w+)\]/g)];
  return matches.length ? (matches[matches.length - 1][1] ?? null) : null;
}

export function applyCollectionProgressMarkers(
  messages: HistoryMessageLike[],
  accumulated: Record<string, unknown>,
): void {
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const assistantText = getHistoryMessageText(msg);
    if (!assistantText.includes(COLLECTION_PROGRESS_PREFIX)) continue;
    let searchFrom = 0;
    while (searchFrom < assistantText.length) {
      const start = assistantText.indexOf(COLLECTION_PROGRESS_PREFIX, searchFrom);
      if (start === -1) break;
      const afterPrefix = start + COLLECTION_PROGRESS_PREFIX.length;
      const colonAfterType = assistantText.indexOf(":", afterPrefix);
      if (colonAfterType === -1) break;
      const jsonStart = assistantText.indexOf("{", colonAfterType);
      if (jsonStart === -1) {
        searchFrom = colonAfterType + 1;
        continue;
      }
      let depth = 0;
      let j = jsonStart;
      for (; j < assistantText.length; j++) {
        const ch = assistantText[j];
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      if (depth !== 0) {
        searchFrom = jsonStart + 1;
        continue;
      }
      if (assistantText[j] === "]") {
        try {
          const fields = JSON.parse(assistantText.slice(jsonStart, j));
          Object.assign(accumulated, fields);
        } catch {
          // Ignore malformed serialized state.
        }
        searchFrom = j + 1;
      } else {
        searchFrom = j;
      }
    }
  }
}
