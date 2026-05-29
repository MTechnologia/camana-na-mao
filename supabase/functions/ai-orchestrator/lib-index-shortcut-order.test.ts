import { ORCHESTRATOR_SHORTCUT_PIPELINE } from "./lib-index-shortcut-order.ts";

Deno.test("ORCHESTRATOR_SHORTCUT_PIPELINE inclui etapas críticas na ordem esperada", () => {
  const steps = [...ORCHESTRATOR_SHORTCUT_PIPELINE];
  const intentIdx = steps.indexOf("resolve_collection_intent");
  const preAiIdx = steps.indexOf("pre_ai_shortcuts");
  const collectionIdx = steps.indexOf("orchestrate_collection_turn");
  const pipelineIdx = steps.indexOf("ai_pipeline");

  if (intentIdx < 0 || preAiIdx < 0 || collectionIdx < 0 || pipelineIdx < 0) {
    throw new Error("pipeline missing required steps");
  }
  if (!(intentIdx < preAiIdx && preAiIdx < collectionIdx && collectionIdx < pipelineIdx)) {
    throw new Error("shortcut order violated: intent → pre_ai → collection → ai_pipeline");
  }
});
