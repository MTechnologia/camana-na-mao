import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  assistantCompletedServicesJourney,
  isServicesJourneyFarewellPending,
} from "./lib-conversation-closing.ts";
import { handleServicesJourneyClosingShortcut } from "./lib-index-services-closing.ts";

const routeReply =
  "Aqui está a rota no Google Maps: https://maps.google.com/maps/dir/?api=1&destination=-23.5,-46.6\n\n" +
  "Posso ajudar em mais alguma coisa?";

Deno.test("assistantCompletedServicesJourney: rota e lista de escolas", () => {
  assertEquals(assistantCompletedServicesJourney(routeReply), true);
  assertEquals(
    assistantCompletedServicesJourney(
      "Não há escolas em 2 km. As 10 escolas mais próximas (até 20 km):\n\n1. ESCOLA X\n\nQuer que eu calcule a rota?",
    ),
    true,
  );
  assertEquals(
    assistantCompletedServicesJourney("[FIELD_REQUEST:service_type]Qual serviço?"),
    false,
  );
});

Deno.test("isServicesJourneyFarewellPending: agradecimento após rota com progresso vazio", () => {
  assertEquals(
    isServicesJourneyFarewellPending(
      "services",
      {},
      "Por hora apenas isso, muito obrigado!",
      routeReply,
      [
        { role: "assistant", content: "[LIGHT_JOURNEY:services]Lista de escolas" },
        { role: "assistant", content: routeReply },
      ],
    ),
    true,
  );
});

Deno.test("handleServicesJourneyClosingShortcut: retorna estrelas sem repetir busca", async () => {
  const result = await handleServicesJourneyClosingShortcut({
    accumulatedFields: {},
    chatMessages: [
      { role: "assistant", content: "[LIGHT_JOURNEY:services][COLLECTION_PROGRESS:services:{}]Resultados" },
      { role: "assistant", content: routeReply },
    ],
    collectionIntent: { type: "services", fields: {} },
    corsHeaders: {},
    lastAssistantText: routeReply,
    lastUserTextEarly: "Por hora apenas isso, muito obrigado!",
  });

  assertEquals(result.response != null, true);
  const text = await result.response!.text();
  assertStringIncludes(text, "serviços perto de você");
  assertStringIncludes(text, "[RATING_PICKER]");
  assertEquals(text.includes("escolas mais próximas"), false);
});
