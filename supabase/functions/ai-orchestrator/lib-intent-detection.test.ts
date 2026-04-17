import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  detectCollectionIntent,
  detectExistingJourney,
  isBusInformationalQuery,
} from "./lib-intent-detection.ts";

const baseDeps = {
  extractTransportFields: (_context: string) => ({ report_type: "atraso" }),
  extractUrbanFields: (_context: string) => ({ category: "lixo" }),
  extractServiceFields: (_context: string) => ({ service_name: "UBS Centro" }),
  extractChamberFields: (_context: string) => ({ category: "feedback_camara" }),
  accumulateFieldsFromHistory: (_history: Array<{ role: string; content: string }>, _journey: "urban_report" | "transport_report" | "service_rating") => ({}),
  isCamaraFuncionamentoInternoQuery: (_userMessage: string) => false,
};

Deno.test("detectExistingJourney: encontra marcador de coleta mais recente", () => {
  const result = detectExistingJourney([
    { role: "assistant", content: "texto livre" },
    { role: "assistant", content: "[COLLECTION_PROGRESS:transport_report:2/5]" },
  ]);

  assertEquals(result, "transport_report");
});

Deno.test("isBusInformationalQuery: reconhece consulta Olho Vivo", () => {
  assertEquals(isBusInformationalQuery("Quando passa o ônibus 875A no ponto?"), true);
});

Deno.test("detectCollectionIntent: mantém histórico como jornada leve", () => {
  const result = detectCollectionIntent(
    "Quero ver meus relatos",
    [{ role: "user", content: "Quero ver meus relatos" }],
    baseDeps,
  );

  assertEquals(result, { type: "history", fields: {} });
});

Deno.test("detectCollectionIntent: classifica relato urbano explícito", () => {
  const result = detectCollectionIntent(
    "Quero abrir um relato de lixo acumulado na rua",
    [{ role: "user", content: "Quero abrir um relato de lixo acumulado na rua" }],
    baseDeps,
  );

  assertEquals(result, { type: "urban_report", fields: { category: "lixo" } });
});
