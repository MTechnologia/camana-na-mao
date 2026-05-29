/** CHB-017: eventos padronizados de jornada do chat (FE). */
export type ChatJourneyEventName =
  | "chat_turn_completed"
  | "chat_turn_failed"
  | "chat_journey_switched"
  | "chat_collection_progress_parsed"
  | "chat_rate_limit_retry";

export type ChatJourneyEventPayload = {
  conversation_id?: string | null;
  journey_type?: string | null;
  fields_count?: number;
  error_kind?: string;
  from_journey?: string | null;
  to_journey?: string | null;
  latency_ms?: number;
  source?: "useUnifiedAIChat";
};

export function trackChatJourneyEvent(
  name: ChatJourneyEventName,
  payload: ChatJourneyEventPayload = {},
): void {
  const detail = {
    name,
    ts: new Date().toISOString(),
    ...payload,
  };
  if (import.meta.env.DEV) {
    console.info("[chat-analytics]", detail);
  }
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("camana:chat-analytics", { detail }));
  } catch {
    /* ignore */
  }
}
