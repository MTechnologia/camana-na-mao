import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  assistantCompletedGeneralCamaraAnswer,
  isGeneralJourneyFarewellPending,
} from "./lib-conversation-closing.ts";
import { handleGeneralJourneyClosingShortcut } from "./lib-index-general-closing.ts";

const processosReply =
  "A Câmara Municipal exerce quatro pilares: **Legislar**, **Fiscalizar**, **Audiências Públicas** e **Estrutura**. " +
  "Se quiser saber como participar de uma sessão ou audiência, é só perguntar.";

Deno.test("assistantCompletedGeneralCamaraAnswer: resposta sobre processos", () => {
  assertEquals(assistantCompletedGeneralCamaraAnswer(processosReply), true);
  assertEquals(
    assistantCompletedGeneralCamaraAnswer(
      "[LIGHT_JOURNEY:general]Claro! Pode perguntar sobre a Câmara Municipal. Qual sua pergunta?",
    ),
    false,
  );
});

Deno.test("handleGeneralJourneyClosingShortcut: agradecimento → estrelas sem chips", async () => {
  const result = await handleGeneralJourneyClosingShortcut({
    chatMessages: [
      { role: "assistant", content: "[LIGHT_JOURNEY:general]Qual sua pergunta?" },
      { role: "assistant", content: processosReply },
    ],
    collectionIntent: { type: "general", fields: {} },
    corsHeaders: {},
    lastAssistantText: processosReply,
    lastUserTextEarly: "Apenas isso mesmo, muito obrigado!",
  });

  assertEquals(result.response != null, true);
  const text = await result.response!.text();
  assertStringIncludes(text, "Câmara Municipal");
  assertStringIncludes(text, "[RATING_PICKER]");
  assertEquals(text.includes("[SHOW_SERVICES_CHIPS]"), false);
  assertEquals(text.includes("Relato Urbano"), false);
});

Deno.test("isGeneralJourneyFarewellPending: não dispara em nova pergunta", () => {
  assertEquals(
    isGeneralJourneyFarewellPending(
      "general",
      "E sobre as comissões, como funcionam?",
      processosReply,
      [{ role: "assistant", content: processosReply }],
    ),
    false,
  );
});
