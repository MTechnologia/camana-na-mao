/**
 * CHB-007: precedência documentada dos atalhos determinísticos no pipeline principal.
 * Manter alinhado com `index.ts` (ordem de execução antes do LLM).
 */
export const ORCHESTRATOR_SHORTCUT_PIPELINE = [
  "bootstrap",
  "council_shortcuts",
  "channel_rating_shortcut",
  "resolve_collection_intent",
  "build_accumulated_context",
  "urban_non_complaint_closing",
  "services_journey_closing",
  "general_journey_closing",
  "pre_ai_shortcuts",
  "orchestrate_collection_turn",
  "deterministic_services_flow",
  "ai_pipeline",
] as const;

export type OrchestratorShortcutStep = (typeof ORCHESTRATOR_SHORTCUT_PIPELINE)[number];
