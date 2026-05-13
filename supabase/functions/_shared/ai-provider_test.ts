import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildChatCompletionsModel,
  buildVertexPublisherModelId,
  hasUsableVertexCredentials,
  isVertexAiProvider,
  normalizeAiChatModel,
  resolveAiProviderConfig,
} from "./ai-provider.ts";

Deno.test("normalizeAiChatModel remove prefixo google e preserva fallback", () => {
  assertEquals(normalizeAiChatModel("google/gemini-3-flash"), "gemini-3-flash");
  assertEquals(normalizeAiChatModel(""), "meta-llama/Meta-Llama-3.1-8B-Instruct");
});

Deno.test("buildChatCompletionsModel prefixa google apenas para Vertex", () => {
  assertEquals(buildChatCompletionsModel("gemini-3-flash", true), "google/gemini-3-flash");
  assertEquals(buildChatCompletionsModel("gemini-3-flash", false), "gemini-3-flash");
  assertEquals(buildVertexPublisherModelId("google/gemini-3-flash"), "gemini-3-flash");
});

Deno.test("resolveAiProviderConfig obtém token Vertex e normaliza modelo", async () => {
  const result = await resolveAiProviderConfig({
    envGet: (key) =>
      ({
        AI_CHAT_BASE_URL:
          "https://southamerica-east1-aiplatform.googleapis.com/v1/projects/proj/locations/southamerica-east1/endpoints/openapi",
        AI_CHAT_MODEL: "google/gemini-3-flash",
        VERTEX_TOKEN_URL: "https://token.example.com",
        VERTEX_TOKEN_SECRET: "secret",
      }[key]),
    fetchImpl: (async () => new Response(JSON.stringify({ token: "vertex-token" }), { status: 200 })) as typeof fetch,
    logPrefix: "[test-ai-provider]",
  });

  assertEquals(isVertexAiProvider(result.finalAiBaseUrl, result.vertexTokenUrl), true);
  assertEquals(result.aiChatModel, "gemini-3-flash");
  assertEquals(result.chatCompletionsModel, "google/gemini-3-flash");
  assertEquals(result.vertexPublisherModelId, "gemini-3-flash");
  assertEquals(result.finalAiApiKey, "vertex-token");
  assertEquals(hasUsableVertexCredentials(result), true);
});
