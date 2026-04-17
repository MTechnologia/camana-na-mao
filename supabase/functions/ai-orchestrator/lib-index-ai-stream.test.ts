import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleAiToolCall, parseAiSseResponse } from "./lib-index-ai-stream.ts";

Deno.test("parseAiSseResponse concatena conteúdo e argumentos de tool call", async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          'data: {"choices":[{"delta":{"content":"Olá"}}]}\n' +
            'data: {"choices":[{"delta":{"tool_calls":[{"id":"call-1","function":{"name":"create_service_rating","arguments":"{\\"rating_stars\\":"}}]}}]}\n' +
            'data: {"choices":[{"delta":{"tool_calls":[{"function":{"arguments":"5}"}}]}}]}\n' +
            "data: [DONE]\n\n",
        ),
      );
      controller.close();
    },
  });

  const result = await parseAiSseResponse(
    new Response(body, { headers: { "content-type": "text/event-stream" } }),
  );

  assertEquals(result.fullContent, "Olá");
  assertEquals(result.toolCallData?.name, "create_service_rating");
  assertEquals(result.toolCallData?.id, "call-1");
  assertEquals(result.toolCallArguments, '{"rating_stars":5}');
});

Deno.test("handleAiToolCall intercepta create_transport_report pedindo subcategoria", async () => {
  const result = await handleAiToolCall({
    accumulatedFields: {
      report_type: "atraso",
      occurrence_time: "08:00",
      direction: "ida",
      personal_impact: 4,
    },
    attachmentUrls: [],
    collectionIntent: { type: "transport_report", fields: {} },
    lastAssistantLower: "",
    mode: "stream",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    toolName: "create_transport_report",
    toolArgs: {
      report_type: "atraso",
      occurrence_time: "08:00",
      direction: "ida",
      personal_impact: 4,
    },
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      isValidTransportSubcategory: () => false,
    } as any,
  });

  const text = await result.text();
  assertEquals(text.includes("[FIELD_REQUEST:sub_category]"), true);
  assertEquals(text.includes("[SUBCATEGORY_PICKER:atraso]"), true);
});

Deno.test("handleAiToolCall executa tool e injeta progresso e light journey", async () => {
  const result = await handleAiToolCall({
    accumulatedFields: {},
    attachmentUrls: [],
    collectionIntent: { type: "service_rating", fields: {} },
    lastAssistantLower: "",
    lightJourneyMarker: "[LIGHT_JOURNEY:service_rating]",
    mode: "stream",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    toolName: "create_service_rating",
    toolArgs: {
      service_type: "ubs",
      rating_stars: 5,
    },
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      executeTool: async () => ({ message: "Avaliação registrada com sucesso." }),
    } as any,
  });

  assertExists(result);
  const text = await result.text();
  assertEquals(text.includes("[LIGHT_JOURNEY:service_rating]"), true);
  assertEquals(text.includes("[COLLECTION_PROGRESS:service_rating:"), true);
  assertEquals(text.includes("Avaliação registrada com sucesso."), true);
});
