import { ENABLE_JOURNEY_SNAPSHOT } from "@/hooks/chat/chatJourneyConfig";

const DISABLE_LOCAL_HEURISTICS =
  String(import.meta.env.VITE_DISABLE_LOCAL_FIELD_HEURISTICS ?? "")
    .trim()
    .toLowerCase() === "true" ||
  String(import.meta.env.VITE_DISABLE_LOCAL_FIELD_HEURISTICS ?? "")
    .trim()
    .toLowerCase() === "1";

const ENABLE_FULL_LOCAL_HEURISTICS =
  String(import.meta.env.VITE_ENABLE_FULL_LOCAL_FIELD_HEURISTICS ?? "")
    .trim()
    .toLowerCase() === "true" ||
  String(import.meta.env.VITE_ENABLE_FULL_LOCAL_FIELD_HEURISTICS ?? "")
    .trim()
    .toLowerCase() === "1";

export type OutgoingFieldHeuristicsMode = "none" | "minimal" | "full";

/**
 * CHB-001: com snapshot ativo, o padrão passa a ser heurísticas mínimas (marcadores/CEP).
 * Use VITE_ENABLE_FULL_LOCAL_FIELD_HEURISTICS=true para o comportamento legado completo.
 */
export function getOutgoingFieldHeuristicsMode(): OutgoingFieldHeuristicsMode {
  if (DISABLE_LOCAL_HEURISTICS) return "none";
  if (ENABLE_FULL_LOCAL_HEURISTICS) return "full";
  if (ENABLE_JOURNEY_SNAPSHOT) return "minimal";
  return "full";
}

/** @deprecated Prefer getOutgoingFieldHeuristicsMode */
export function shouldRunOutgoingFieldHeuristics(): boolean {
  return getOutgoingFieldHeuristicsMode() !== "none";
}
