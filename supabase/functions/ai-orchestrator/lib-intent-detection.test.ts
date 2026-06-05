import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  detectCollectionIntent,
  detectExistingJourney,
  isBusInformationalQuery,
  messageLooksLikeTransportProblemReport,
} from "./lib-intent-detection.ts";
import { isCamaraFuncionamentoInternoQuery } from "./lib-citizen-support.ts";

const baseDeps = {
  extractTransportFields: (_context: string) => ({ report_type: "atraso" }),
  extractUrbanFields: (_context: string) => ({ category: "lixo" }),
  extractServiceFields: (_context: string) => ({ service_name: "UBS Centro" }),
  extractChamberFields: (_context: string) => ({ category: "feedback_camara" }),
  accumulateFieldsFromHistory: (_history: Array<{ role: string; content: string }>, _journey: "urban_report" | "transport_report" | "service_rating") => ({}),
  isCamaraFuncionamentoInternoQuery: (_userMessage: string) => false,
};

Deno.test("isBusInformationalQuery: reconhece 'qual a linha que passa em X' e variantes", () => {
  assertEquals(
    isBusInformationalQuery("Qual a linha de ônibus que passa na avenida Lineu de Paula Machado?"),
    true,
  );
  assertEquals(isBusInformationalQuery("Quais ônibus passam na Lineu de Paula Machado?"), true);
  assertEquals(isBusInformationalQuery("que linha passa em frente ao Jockey Club"), true);
  assertEquals(isBusInformationalQuery("linha de ônibus que passa pela avenida Paulista"), true);
});

Deno.test("isBusInformationalQuery: NÃO captura reclamações de transporte", () => {
  assertEquals(isBusInformationalQuery("a linha 477 que passa aqui está sempre atrasada"), false);
  assertEquals(isBusInformationalQuery("o ônibus que passa na minha rua vive lotado"), false);
});

Deno.test("detectCollectionIntent: pergunta informacional de linha vira general, não transport_report", () => {
  const result = detectCollectionIntent(
    "Qual a linha de ônibus que passa na avenida Lineu de Paula Machado?",
    [],
    baseDeps,
  );
  assertEquals(result?.type, "general");
});

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

Deno.test("messageLooksLikeTransportProblemReport: motorista que não para no ponto é problema de transporte", () => {
  assertEquals(
    messageLooksLikeTransportProblemReport("Todo dia o motorista passa e não para no ponto"),
    true,
  );
  assertEquals(messageLooksLikeTransportProblemReport("o ônibus passou direto e não parou"), true);
  // Sem domínio de transporte (buraco) → não é relato de transporte
  assertEquals(messageLooksLikeTransportProblemReport("o buraco não para de aumentar na rua"), false);
});

Deno.test("detectCollectionIntent: 'motorista não para no ponto' em jornada urbana → transport_report", () => {
  const history = [
    { role: "user", content: "Quero falar sobre a cidade" },
    { role: "user", content: "reclamacao" },
    { role: "assistant", content: "[COLLECTION_PROGRESS:urban_report:3/8] O que está acontecendo?" },
  ];
  const result = detectCollectionIntent(
    "Todo dia o motorista passa e não para no ponto",
    history,
    baseDeps,
  );
  assertEquals(result?.type, "transport_report");
});

// Deps com o detector REAL de funcionamento interno da Câmara (em produção é o
// lib.ts que o injeta; os testes acima usam `=> false`, por isso não pegavam
// este caso). Regressão do bug: consulta institucional virava relato urbano.
const camaraDeps = { ...baseDeps, isCamaraFuncionamentoInternoQuery };

Deno.test("detectCollectionIntent: consulta estrutural/institucional sobre a Câmara → general (não relato urbano)", () => {
  assertEquals(
    detectCollectionIntent(
      "Quero conhecer a estrutura e o funcionamento da Câmara Municipal",
      [],
      camaraDeps,
    )?.type,
    "general",
  );
  assertEquals(detectCollectionIntent("Conheça a Câmara", [], camaraDeps)?.type, "general");
  assertEquals(
    detectCollectionIntent("Como a Câmara é organizada?", [], camaraDeps)?.type,
    "general",
  );
});

Deno.test("detectCollectionIntent: relato urbano legítimo continua urban_report com detector ligado", () => {
  assertEquals(
    detectCollectionIntent(
      "Tem um buraco enorme na minha rua",
      [{ role: "user", content: "Tem um buraco enorme na minha rua" }],
      camaraDeps,
    )?.type,
    "urban_report",
  );
});

// Regressão (NREF012/feedback): "Quero elogiar/reclamar/sugerir + vereador"
// caía no fluxo genérico de relato urbano ("qual é o tipo do seu relato sobre a
// cidade?") porque as palavras de natureza e a frase "quero elogiar" pontuavam e
// recebiam boost no domínio urbano. Deve virar feedback à Câmara (no detector,
// chamber_feedback é devolvido como urban_report com category=feedback_camara).
const fieldCategory = (r: ReturnType<typeof detectCollectionIntent>) =>
  (r?.fields as { category?: string } | undefined)?.category;

Deno.test("detectCollectionIntent: 'Quero elogiar um vereador' → feedback à Câmara, não relato urbano genérico", () => {
  const result = detectCollectionIntent(
    "Quero elogiar um vereador",
    [{ role: "user", content: "Quero elogiar um vereador" }],
    camaraDeps,
  );
  assertEquals(result?.type, "urban_report");
  assertEquals(fieldCategory(result), "feedback_camara");
});

Deno.test("detectCollectionIntent: 'Quero reclamar de um vereador' → feedback à Câmara", () => {
  const result = detectCollectionIntent(
    "Quero reclamar de um vereador",
    [{ role: "user", content: "Quero reclamar de um vereador" }],
    camaraDeps,
  );
  assertEquals(result?.type, "urban_report");
  assertEquals(fieldCategory(result), "feedback_camara");
});

Deno.test("detectCollectionIntent: relato urbano que cita o vereador continua urban_report (buraco perto do gabinete)", () => {
  const result = detectCollectionIntent(
    "Tem um buraco enorme na rua perto do gabinete do vereador",
    [{ role: "user", content: "Tem um buraco enorme na rua perto do gabinete do vereador" }],
    camaraDeps,
  );
  assertEquals(result?.type, "urban_report");
  // category=lixo é o mock de extractUrbanFields → provou que pegou o caminho
  // urbano (há problema concreto), não o de feedback à Câmara.
  assertEquals(fieldCategory(result), "lixo");
});

Deno.test("detectCollectionIntent: 'estação de trem mais próxima' → services (não relato de transporte)", () => {
  const result = detectCollectionIntent(
    "Qual a estação de trem mais próxima?",
    [{ role: "user", content: "Qual a estação de trem mais próxima?" }],
    baseDeps,
  );
  assertEquals(result?.type, "services");
});

Deno.test("detectCollectionIntent: 'onde fica a estação da Luz' → services (localização de transporte)", () => {
  assertEquals(
    detectCollectionIntent(
      "onde fica a estação da Luz",
      [{ role: "user", content: "onde fica a estação da Luz" }],
      baseDeps,
    )?.type,
    "services",
  );
});

Deno.test("detectCollectionIntent: PROBLEMA no transporte continua transport_report", () => {
  assertEquals(
    detectCollectionIntent(
      "o trem está sempre lotado e atrasado",
      [{ role: "user", content: "o trem está sempre lotado e atrasado" }],
      baseDeps,
    )?.type,
    "transport_report",
  );
});
