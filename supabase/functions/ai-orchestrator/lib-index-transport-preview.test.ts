import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildTransportFinalPreviewMessage,
  formatTransportAccessibilitySummary,
  transportImpactSummaryLine,
} from "./lib-index-transport-preview.ts";

Deno.test("transportImpactSummaryLine classifica faixas de impacto", () => {
  assertEquals(transportImpactSummaryLine(5), "Alto (compromisso / não embarcou)");
  assertEquals(transportImpactSummaryLine("4"), "Atraso relevante (>30 min)");
  assertEquals(transportImpactSummaryLine(3), "Atraso moderado (<30 min)");
  assertEquals(transportImpactSummaryLine(""), "Não informado");
});

Deno.test("formatTransportAccessibilitySummary resume detalhes preenchidos", () => {
  assertEquals(
    formatTransportAccessibilitySummary({
      rampa: true,
      elevador: false,
      observacoes: "sem apoio",
    }),
    "Rampa; Elevador / escada rolante: não; Observações: sem apoio",
  );
});

Deno.test("buildTransportFinalPreviewMessage mantém resumo e marcador", () => {
  const message = buildTransportFinalPreviewMessage(
    {
      description: "Onibus demorou muito e veio lotado",
      report_type: "lotacao",
      sub_category: "superlotado",
      line_code: "875A-10",
      occurrence_date: "2026-04-15",
      occurrence_time: "07:30",
      direction: "ida",
      recurrence_frequency: "toda_semana",
      personal_impact: 4,
      stop_name: "Parada Central",
    },
    "",
  );

  assertStringIncludes(message, "**Resumo do relato de transporte**");
  assertStringIncludes(message, "Lotação");
  assertStringIncludes(message, "[TRANSPORT_PREVIEW_JSON:");
  assertStringIncludes(message, "[QUICK_REPLY:confirmar,corrigir]");
});
