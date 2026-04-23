import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { callAiChatCompletion } from "./lib-index-ai-api.ts";

Deno.test("callAiChatCompletion retorna erro quando Vertex está sem token", async () => {
  const result = await callAiChatCompletion({
    aiChatModel: "gemini-2.5-flash",
    chatMessages: [],
    corsHeaders: {},
    dynamicSystemPrompt: "base",
    effectiveTools: [],
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com/aiplatform",
    requestStartTime: Date.now(),
    vertexTokenObtained: false,
    vertexTokenUrl: "https://token.example.com",
  });

  assertExists(result.errorResponse);
  const text = await result.errorResponse!.text();
  assertEquals(text.includes("token do Vertex"), true);
});

Deno.test("callAiChatCompletion envia requisição com model prefixado para Vertex", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response("data: test\n\n", {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  }) as typeof fetch;

  try {
    const result = await callAiChatCompletion({
      aiChatModel: "gemini-2.5-flash",
      chatMessages: [{ role: "user", content: "oi" }],
      corsHeaders: {},
      dynamicSystemPrompt: "base",
      effectiveTools: [{ function: { name: "tool_a" } }],
      finalAiApiKey: "secret",
      finalAiBaseUrl: "https://example.com/aiplatform",
      requestStartTime: Date.now(),
      vertexTokenObtained: true,
      vertexTokenUrl: "https://token.example.com",
    });

    assertExists(result.response);
    assertEquals(capturedUrl, "https://example.com/aiplatform/chat/completions");
    assertEquals((capturedInit?.headers as Record<string, string>).Authorization, "Bearer secret");
    const body = String(capturedInit?.body ?? "");
    assertEquals(body.includes('"model":"google/gemini-2.5-flash"'), true);
    assertEquals(body.includes('"tool_choice":"auto"'), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("callAiChatCompletion aceita Bearer já resolvido para Vertex sem token URL", async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    capturedInit = init;
    return new Response("data: test\n\n", {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  }) as typeof fetch;

  try {
    const result = await callAiChatCompletion({
      aiChatModel: "gemini-3-flash",
      chatMessages: [{ role: "user", content: "oi" }],
      corsHeaders: {},
      dynamicSystemPrompt: "base",
      effectiveTools: [],
      finalAiApiKey: "manual-bearer",
      finalAiBaseUrl: "https://southamerica-east1-aiplatform.googleapis.com/v1/projects/p/locations/southamerica-east1/endpoints/openapi",
      requestStartTime: Date.now(),
      vertexTokenObtained: false,
    });

    assertExists(result.response);
    const body = String(capturedInit?.body ?? "");
    assertEquals(body.includes('"model":"google/gemini-3-flash"'), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("callAiChatCompletion trata 400 com resposta amigável", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("tool_choice inválido", {
      status: 400,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  try {
    const result = await callAiChatCompletion({
      aiChatModel: "gpt-test",
      chatMessages: [],
      corsHeaders: {},
      dynamicSystemPrompt: "base",
      effectiveTools: [],
      finalAiApiKey: "",
      finalAiBaseUrl: "https://example.com",
      requestStartTime: Date.now(),
      vertexTokenObtained: true,
    });

    assertExists(result.errorResponse);
    const text = await result.errorResponse!.text();
    assertEquals(text.includes("houve um erro ao processar sua solicitação"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("callAiChatCompletion trata 400 de thought signature com mensagem orientativa", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("thought_signature is required for this turn", {
      status: 400,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  try {
    const result = await callAiChatCompletion({
      aiChatModel: "gemini-3-flash",
      chatMessages: [],
      corsHeaders: {},
      dynamicSystemPrompt: "base",
      effectiveTools: [],
      finalAiApiKey: "secret",
      finalAiBaseUrl: "https://example.com/aiplatform",
      requestStartTime: Date.now(),
      vertexTokenObtained: true,
      vertexTokenUrl: "https://token.example.com",
    });

    assertExists(result.errorResponse);
    const text = await result.errorResponse!.text();
    assertEquals(text.includes("exige suporte adicional de estado de conversa"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
