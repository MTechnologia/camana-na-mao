/// <reference lib="deno.ns" />
import {
  applyUrbanQuickModeDefaults,
  detectUrbanQuickReportIntent,
  detectUrbanQuickModeFromHistory,
} from "./lib-urban-quick-mode.ts";

Deno.test("detectUrbanQuickReportIntent reconhece marcador e frase", () => {
  if (!detectUrbanQuickReportIntent("[URBAN_QUICK_REPORT] Quero registrar")) {
    throw new Error("marker");
  }
  if (!detectUrbanQuickReportIntent("Quero um relato rápido do buraco")) {
    throw new Error("phrase");
  }
});

Deno.test("applyUrbanQuickModeDefaults preenche risco e escopo", () => {
  const fields: Record<string, unknown> = {};
  applyUrbanQuickModeDefaults(fields);
  if (fields.risk_level !== "low" || fields.affected_scope !== "individual") {
    throw new Error("defaults");
  }
});

Deno.test("detectUrbanQuickModeFromHistory lê última mensagem do usuário", () => {
  const ok = detectUrbanQuickModeFromHistory([
    { role: "assistant", content: "ok" },
    { role: "user", content: "relato rápido na minha rua" },
  ]);
  if (!ok) throw new Error("history");
});
