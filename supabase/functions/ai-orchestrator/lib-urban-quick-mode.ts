/** CHB-005: relato urbano rápido — menos perguntas de risco/escopo com defaults seguros. */

export const URBAN_QUICK_REPORT_MARKER = "[URBAN_QUICK_REPORT]";

export function detectUrbanQuickReportIntent(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  if (raw.includes(URBAN_QUICK_REPORT_MARKER)) return true;
  return /\brelato\s+r[aá]pido\b/i.test(raw);
}

export function detectUrbanQuickModeFromHistory(
  messages: Array<{ role?: string; content?: string }>,
): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const content = typeof m.content === "string" ? m.content : "";
    if (detectUrbanQuickReportIntent(content)) return true;
  }
  return false;
}

export function applyUrbanQuickModeDefaults(fields: Record<string, unknown>): void {
  if (!fields._urban_quick_mode) fields._urban_quick_mode = true;
  if (!fields.affected_scope) {
    fields.affected_scope = "individual";
    fields._affected_scope_quick_default = true;
  }
  if (!fields.risk_level) {
    fields.risk_level = "low";
    fields._risk_quick_default = true;
  }
}

export function shouldSkipUrbanRiskScopeQuestions(fields: Record<string, unknown>): boolean {
  return fields._urban_quick_mode === true;
}
