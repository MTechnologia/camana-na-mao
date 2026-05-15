import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  appendConversationClosingIfNeeded,
  assistantOfferedChannelRating,
  buildConversationClosingMessage,
  parseChannelRatingFromUserMessage,
  userAcknowledgedUrbanNonComplaintAnswer,
  userFarewellWithoutRating,
} from "./lib-conversation-closing.ts";

Deno.test("buildConversationClosingMessage: elogio com encaminhamento inclui agradecimento", () => {
  const msg = buildConversationClosingMessage({
    kind: "council_referral_full",
    councilName: "Vereador Exemplo",
    councilParty: "PT",
    reportNature: "elogio",
  });
  assertStringIncludes(msg, "elogio");
  assertStringIncludes(msg, "[RATING_PICKER]");
});

Deno.test("buildConversationClosingMessage: sugestão com encaminhamento parcial inclui agradecimento e estrelas", () => {
  const msg = buildConversationClosingMessage({
    kind: "council_referral_partial",
    councilName: "Amanda Paschoal",
    councilParty: "PSOL",
    reportNature: "sugestao",
  });
  assertStringIncludes(msg, "Pedido registrado");
  assertStringIncludes(msg, "Amanda Paschoal");
  assertStringIncludes(msg, "sugestão");
  assertStringIncludes(msg, "[FIELD_REQUEST:channel_rating]");
  assertStringIncludes(msg, "[RATING_PICKER]");
});

Deno.test("parseChannelRatingFromUserMessage: RATING_SELECTED", () => {
  assertEquals(parseChannelRatingFromUserMessage("Nota: 4 estrelas [RATING_SELECTED:4]"), 4);
});

Deno.test("userAcknowledgedUrbanNonComplaintAnswer: reconhece agradecimento", () => {
  assertEquals(
    userAcknowledgedUrbanNonComplaintAnswer("Maravilha, muito obrigado pelas informações"),
    true,
  );
  assertEquals(userAcknowledgedUrbanNonComplaintAnswer("E sobre o carnaval, como funciona?"), false);
});

Deno.test("userFarewellWithoutRating: despedida após oferta", () => {
  assertEquals(userFarewellWithoutRating("Acho que por hora é apenas isso mesmo, muito obrigado!"), true);
});

Deno.test("assistantOfferedChannelRating: detecta marcadores", () => {
  assertEquals(
    assistantOfferedChannelRating(
      "Texto\n[FIELD_REQUEST:channel_rating]Pergunta\n\n[RATING_PICKER]",
    ),
    true,
  );
});

Deno.test("buildConversationClosingMessage: jornada general (Câmara) concluída", () => {
  const msg = buildConversationClosingMessage({ kind: "general_journey_completed" });
  assertStringIncludes(msg, "Câmara Municipal");
  assertStringIncludes(msg, "[RATING_PICKER]");
  assertEquals(msg.includes("[SHOW_SERVICES_CHIPS]"), false);
});

Deno.test("buildConversationClosingMessage: serviços próximos concluídos", () => {
  const msg = buildConversationClosingMessage({ kind: "services_journey_completed" });
  assertStringIncludes(msg, "serviços perto de você");
  assertStringIncludes(msg, "[RATING_PICKER]");
});

Deno.test("buildConversationClosingMessage: dúvida respondida com agradecimento", () => {
  const msg = buildConversationClosingMessage({
    kind: "urban_non_complaint_answered",
    reportNature: "duvida",
  });
  assertStringIncludes(msg, "Que bom que as informações ajudaram");
  assertStringIncludes(msg, "[FIELD_REQUEST:channel_rating]");
  assertStringIncludes(msg, "[RATING_PICKER]");
  assertEquals(msg.includes("vereador"), false);
});

Deno.test("appendConversationClosingIfNeeded substitui fechamento legado", () => {
  const out = appendConversationClosingIfNeeded("Ok.\n\nPosso ajudar com mais alguma coisa?", {
    kind: "generic",
  });
  assertEquals(out.includes("Posso ajudar com mais alguma coisa?"), false);
  assertStringIncludes(out, "[RATING_PICKER]");
});
