import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { runAiPipeline } from "./lib-index-ai-pipeline.ts";

function createBaseLib(overrides: Record<string, unknown> = {}) {
  return {
    corsHeaders: {},
    ...overrides,
  };
}

Deno.test("runAiPipeline retorna short-circuit determinístico imediatamente", async () => {
  const result = await runAiPipeline({
    accumulatedFields: {},
    aiChatModel: "gpt-test",
    attachmentUrls: [],
    chatMessages: [],
    collectionIntent: null,
    dynamicSystemPrompt: "base",
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com",
    journeySwitched: false,
    lastAssistantLower: "",
    lastUserMessage: "oi",
    lastUserMsg: "oi",
    lightJourneyMarker: "",
    msgLower: "oi",
    nextFieldInfo: { field: null, picker: null, prompt: null },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    vertexTokenObtained: true,
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
    deps: {
      // deno-lint-ignore no-explicit-any
      handleDeterministicShortcuts: async () => ({ response: new Response("atalho", { status: 200 }) }) as any,
    },
  });

  assertEquals(await result.text(), "atalho");
});

Deno.test("runAiPipeline executa tool call vindo do stream", async () => {
  let receivedToolName = "";
  let receivedToolArgs: Record<string, unknown> | null = null;

  const result = await runAiPipeline({
    accumulatedFields: { category: "iluminacao" },
    aiChatModel: "gpt-test",
    attachmentUrls: [],
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    dynamicSystemPrompt: "base",
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com",
    journeySwitched: false,
    lastAssistantLower: "",
    lastUserMessage: "poste apagado",
    lastUserMsg: "poste apagado",
    lightJourneyMarker: "",
    msgLower: "poste apagado",
    nextFieldInfo: { field: null, picker: null, prompt: null },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    vertexTokenObtained: true,
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
    deps: {
      // deno-lint-ignore no-explicit-any
      handleDeterministicShortcuts: async () => ({}) as any,
      // deno-lint-ignore no-explicit-any
      buildPromptContextAndTools: async () => ({ dynamicSystemPrompt: "base", effectiveTools: [] }) as any,
      // deno-lint-ignore no-explicit-any
      callAiChatCompletion: async () => ({
        response: new Response("stream", {
          headers: { "content-type": "text/event-stream" },
        }),
      }) as any,
      // deno-lint-ignore no-explicit-any
      parseAiSseResponse: async () => ({
        fullContent: "",
        toolCallArguments: '{"category":"iluminacao"}',
        toolCallData: { name: "create_urban_report" },
      }) as any,
      // deno-lint-ignore no-explicit-any
      handleAiToolCall: async (args: any) => {
        receivedToolName = args.toolName;
        receivedToolArgs = args.toolArgs;
        return new Response("tool-ok");
      },
    },
  });

  assertEquals(receivedToolName, "create_urban_report");
  assertEquals(receivedToolArgs, { category: "iluminacao" });
  assertEquals(await result.text(), "tool-ok");
});

Deno.test("runAiPipeline usa fallback non-stream quando resposta nao eh SSE", async () => {
  const result = await runAiPipeline({
    accumulatedFields: {},
    aiChatModel: "gpt-test",
    attachmentUrls: [],
    chatMessages: [],
    collectionIntent: null,
    dynamicSystemPrompt: "base",
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com",
    journeySwitched: false,
    lastAssistantLower: "",
    lastUserMessage: "oi",
    lastUserMsg: "oi",
    lightJourneyMarker: "",
    msgLower: "oi",
    nextFieldInfo: { field: null, picker: null, prompt: null },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    vertexTokenObtained: true,
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
    deps: {
      // deno-lint-ignore no-explicit-any
      handleDeterministicShortcuts: async () => ({}) as any,
      // deno-lint-ignore no-explicit-any
      buildPromptContextAndTools: async () => ({ dynamicSystemPrompt: "base", effectiveTools: [] }) as any,
      // deno-lint-ignore no-explicit-any
      callAiChatCompletion: async () => ({
        response: new Response('{"ok":true}', {
          headers: { "content-type": "application/json" },
        }),
      }) as any,
      // deno-lint-ignore no-explicit-any
      handleAiNonStreamResponse: async () => new Response("non-stream-ok"),
    },
  });

  assertExists(result);
  assertEquals(await result.text(), "non-stream-ok");
});
