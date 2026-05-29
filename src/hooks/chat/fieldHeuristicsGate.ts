import { ENABLE_JOURNEY_SNAPSHOT } from "@/hooks/chat/chatJourneyConfig";

const DISABLE_LOCAL_HEURISTICS =
  String(import.meta.env.VITE_DISABLE_LOCAL_FIELD_HEURISTICS ?? "").trim().toLowerCase() ===
    "true" ||
  String(import.meta.env.VITE_DISABLE_LOCAL_FIELD_HEURISTICS ?? "").trim().toLowerCase() === "1";

/**
 * CHB-001: heurísticas locais complementam o BE; podem ser desligadas quando o snapshot
 * e o COLLECTION_PROGRESS forem a fonte de verdade (opt-in via env).
 */
export function shouldRunOutgoingFieldHeuristics(): boolean {
  if (DISABLE_LOCAL_HEURISTICS) return false;
  if (ENABLE_JOURNEY_SNAPSHOT) {
    const minimal =
      String(import.meta.env.VITE_LOCAL_FIELD_HEURISTICS_MINIMAL ?? "").trim().toLowerCase();
    if (minimal === "true" || minimal === "1") return false;
  }
  return true;
}
