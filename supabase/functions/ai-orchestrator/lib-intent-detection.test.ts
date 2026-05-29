import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  detectCollectionIntent,
  detectExistingJourney,
  isBusInformationalQuery,
  messageLooksLikeTransportProblemReport,
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

Deno.test("isBusInformationalQuery: tempo real, parada e sentido (não é relato)", () => {
  assertEquals(isBusInformationalQuery("onibus 509 tempo real no ponto"), true);
  assertEquals(isBusInformationalQuery("horario da parada do onibus 875"), true);
  assertEquals(isBusInformationalQuery("linha 875 sentido centro horario"), true);
  assertEquals(isBusInformationalQuery("previsao de chegada do onibus 509"), true);
});

Deno.test("isBusInformationalQuery: reclamação de transporte não vira Olho Vivo", () => {
  assertEquals(isBusInformationalQuery("onibus atrasou mt no pico"), false);
  assertEquals(isBusInformationalQuery("o onibus nao passou no ponto hj"), false);
});

Deno.test("detectCollectionIntent: urbano com typos (pichação, barulho)", () => {
  assertEquals(
    detectCollectionIntent(
      "pichacao no muro da escola",
      [{ role: "user", content: "pichacao no muro da escola" }],
      baseDeps,
    )?.type,
    "urban_report",
  );
  assertEquals(
    detectCollectionIntent(
      "cachorro solto atacando na calcada",
      [{ role: "user", content: "cachorro solto atacando na calcada" }],
      baseDeps,
    )?.type,
    "urban_report",
  );
});

Deno.test("detectCollectionIntent: serviços CAPS e AMA", () => {
  assertEquals(
    detectCollectionIntent(
      "caps mais perto daqui",
      [{ role: "user", content: "caps mais perto daqui" }],
      baseDeps,
    )?.type,
    "services",
  );
  assertEquals(
    detectCollectionIntent(
      "ama 24h perto de casa",
      [{ role: "user", content: "ama 24h perto de casa" }],
      baseDeps,
    )?.type,
    "services",
  );
});

Deno.test("detectCollectionIntent: ocupação em pronto-socorro", () => {
  assertEquals(
    detectCollectionIntent(
      "lotacao do pronto socorro agora?",
      [{ role: "user", content: "lotacao do pronto socorro agora?" }],
      baseDeps,
    )?.type,
    "occupancy",
  );
});

Deno.test("detectCollectionIntent: consulta Olho Vivo → general", () => {
  assertEquals(
    detectCollectionIntent(
      "onibus 509 tempo real no ponto",
      [{ role: "user", content: "onibus 509 tempo real no ponto" }],
      baseDeps,
    )?.type,
    "general",
  );
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

Deno.test("messageLooksLikeTransportProblemReport: ônibus atrasando", () => {
  assertEquals(messageLooksLikeTransportProblemReport("O ônibus está atrasando demais"), true);
  assertEquals(messageLooksLikeTransportProblemReport("onibus 509 tempo real no ponto"), false);
});

Deno.test("detectCollectionIntent: relato de ônibus em jornada urbana → transport_report", () => {
  const history = [
    { role: "user", content: "Quero falar sobre a cidade" },
    { role: "user", content: "reclamacao" },
    { role: "assistant", content: "[COLLECTION_PROGRESS:urban_report:2/8] O que está acontecendo?" },
  ];
  const result = detectCollectionIntent("O ônibus está atrasando demais", history, baseDeps);
  assertEquals(result?.type, "transport_report");
});
