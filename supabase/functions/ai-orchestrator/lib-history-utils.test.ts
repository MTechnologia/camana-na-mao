import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  applyCollectionProgressMarkers,
  getHistoryMessageText,
  getLastFieldRequestType,
} from "./lib-history-utils.ts";

Deno.test("getHistoryMessageText: extrai texto de payload estruturado", () => {
  const text = getHistoryMessageText({
    role: "assistant",
    content: [
      { type: "image", url: "https://example.com/x.png" },
      { type: "text", text: "Olá mundo" },
    ],
  });

  assertEquals(text, "Olá mundo");
});

Deno.test("getLastFieldRequestType: ignora FIELD_REQUEST dentro de COLLECTION_PROGRESS", () => {
  const progressPayload = {
    description: "Texto com [FIELD_REQUEST:description] serializado",
    report_type: "atraso",
  };
  const assistantText =
    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(progressPayload)}]` +
    `[FIELD_REQUEST:sub_category]Qual detalhe descreve melhor esse problema?`;

  assertEquals(getLastFieldRequestType(assistantText), "sub_category");
});

Deno.test("applyCollectionProgressMarkers: hidrata estado com múltiplos markers", () => {
  const accumulated: Record<string, unknown> = {};

  applyCollectionProgressMarkers(
    [
      {
        role: "assistant",
        content: '[COLLECTION_PROGRESS:urban_report:{"category":"lixo"}]',
      },
      {
        role: "assistant",
        content: '[COLLECTION_PROGRESS:urban_report:{"description":"Há lixo acumulado","cep":"01000000"}]',
      },
    ],
    accumulated,
  );

  assertEquals(accumulated.category, "lixo");
  assertEquals(accumulated.description, "Há lixo acumulado");
  assertEquals(accumulated.cep, "01000000");
});
