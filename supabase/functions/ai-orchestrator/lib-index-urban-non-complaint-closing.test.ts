import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleUrbanNonComplaintClosingShortcut } from "./lib-index-urban-non-complaint-closing.ts";

const duvidaFields = {
  report_nature: "duvida",
  description:
    "Gostaria de saber como é feito o planejamento para o policiamento em eventos na cidade de São Paulo",
  category: "outro",
};

const longAnswer =
  "A Câmara Municipal não opera o policiamento em eventos — isso é responsabilidade do Executivo. " +
  "O papel da Câmara é fiscalizar e propor políticas públicas por meio de leis e audiências. " +
  "Para detalhes operacionais, consulte a Prefeitura (156) ou a Polícia Militar.";

Deno.test("handleUrbanNonComplaintClosingShortcut: agradecimento após dúvida → estrelas", async () => {
  const result = await handleUrbanNonComplaintClosingShortcut({
    accumulatedFields: duvidaFields,
    chatMessages: [
      { role: "assistant", content: `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(duvidaFields)}]` },
      { role: "assistant", content: longAnswer },
    ],
    corsHeaders: {},
    lastAssistantText: longAnswer,
    lastUserTextEarly: "Maravilha, muito obrigado pelas informações",
    lib: {
      isUrbanNonComplaintReadyForLlmTurn: (fields: Record<string, unknown>) =>
        fields.report_nature === "duvida" && !!fields.description && !!fields.category,
    } as typeof import("./lib.ts"),
  });

  assertEquals(result.response != null, true);
  const text = await result.response!.text();
  assertStringIncludes(text, "Que bom que as informações ajudaram");
  assertStringIncludes(text, "[RATING_PICKER]");
  assertEquals(text.includes("vereador"), false);
  assertEquals(text.includes("[SHOW_SERVICES_CHIPS]"), false);
});

Deno.test("handleUrbanNonComplaintClosingShortcut: nova pergunta não dispara fechamento", async () => {
  const result = await handleUrbanNonComplaintClosingShortcut({
    accumulatedFields: duvidaFields,
    chatMessages: [],
    corsHeaders: {},
    lastAssistantText: longAnswer,
    lastUserTextEarly: "E sobre eventos de carnaval, como funciona?",
    lib: {
      isUrbanNonComplaintReadyForLlmTurn: () => true,
    } as typeof import("./lib.ts"),
  });

  assertEquals(result.response, undefined);
});
