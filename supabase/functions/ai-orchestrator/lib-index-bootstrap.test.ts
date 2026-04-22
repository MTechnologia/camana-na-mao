import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { initializeRequestBootstrap } from "./lib-index-bootstrap.ts";

function createMockSupabaseClient(userId: string | null): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: userId ? { id: userId } : null,
        },
        error: null,
      }),
    },
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  } as unknown as SupabaseClient;
}

Deno.test("initializeRequestBootstrap retorna 401 quando falta Authorization", async () => {
  const response = await initializeRequestBootstrap({
    corsHeaders: {},
    envGet: (key) =>
      ({
        AI_CHAT_BASE_URL: "https://ai.example.com",
        SUPABASE_URL: "https://supabase.example.com",
        SUPABASE_ANON_KEY: "anon-key",
      }[key]),
    req: new Request("https://example.com/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
      headers: { "Content-Type": "application/json" },
    }),
  });

  assertExists(response.response);
  assertEquals(response.context, undefined);
  assertEquals(response.response!.status, 401);
  assertEquals(await response.response!.text(), '{"error":"Missing authorization header. Please log in again."}');
});

Deno.test("initializeRequestBootstrap obtém token do Vertex e deriva contexto do chat", async () => {
  const createClientCalls: Array<{ url: string; key: string; hasAuthHeader: boolean }> = [];
  const createClientImpl = (
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ): SupabaseClient => {
    createClientCalls.push({
      url,
      key,
      hasAuthHeader: !!options?.global?.headers?.Authorization,
    });
    return createMockSupabaseClient("user-123");
  };

  const result = await initializeRequestBootstrap({
    corsHeaders: {},
    createClientImpl,
    envGet: (key) =>
      ({
        AI_CHAT_BASE_URL: "https://ai.example.com",
        AI_CHAT_API_KEY: "fallback-key",
        AI_CHAT_MODEL: "google/gemini-test",
        SUPABASE_URL: "https://supabase.example.com",
        SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        VERTEX_TOKEN_URL: "https://token.example.com",
        VERTEX_TOKEN_SECRET: "super-secret",
        VERTEX_RAG_DATASTORE: "datastore-1",
        VERTEX_RAG_CORPUS: "corpus-1",
      }[key]),
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      assertEquals(String(input), "https://token.example.com");
      assertEquals(init?.headers, { "X-Token-Secret": "super-secret" });
      return new Response(JSON.stringify({ token: "vertex-token" }), { status: 200 });
    }) as typeof fetch,
    req: new Request("https://example.com/chat", {
      method: "POST",
      body: JSON.stringify({
        collectionType: "urban_report",
        conversationId: "conv-1",
        evaluationContext: { serviceTypeId: "42" },
        messages: [
          { role: "assistant", content: "Relato registrado" },
          { role: "user", content: [{ type: "text", text: "Meu relato" }] },
          { role: "user", content: "Foto anexada", attachmentUrls: ["https://cdn.example.com/foto.jpg"] },
        ],
      }),
      headers: {
        Authorization: "Bearer token.test.value",
        "Content-Type": "application/json",
      },
    }),
  });

  assertExists(result.context);
  assertEquals(result.response, undefined);
  assertEquals(result.context!.finalAiApiKey, "vertex-token");
  assertEquals(result.context!.vertexTokenObtained, true);
  assertEquals(result.context!.vertexTokenUrl, "https://token.example.com");
  assertEquals(result.context!.vertexRagDatastore, "datastore-1");
  assertEquals(result.context!.vertexRagCorpus, "corpus-1");
  assertEquals(result.context!.frontendCollectionType, "urban_report");
  assertEquals(result.context!.conversationId, "conv-1");
  assertEquals(result.context!.lastUserMsg, "Foto anexada");
  assertEquals(result.context!.lastAssistantText, "Relato registrado");
  assertEquals(result.context!.attachmentUrls, ["https://cdn.example.com/foto.jpg"]);
  assertEquals(result.context!.chatHistoryTyped.length, 3);
  assertEquals(result.context!.user.id, "user-123");
  assertEquals(createClientCalls.length, 2);
  assertEquals(createClientCalls[0].url, "https://supabase.example.com");
  assertEquals(createClientCalls[0].key, "anon-key");
  assertEquals(createClientCalls[0].hasAuthHeader, true);
  assertEquals(createClientCalls[1].key, "service-role-key");
});

Deno.test("initializeRequestBootstrap retorna 400 quando body JSON é inválido", async () => {
  const result = await initializeRequestBootstrap({
    corsHeaders: {},
    createClientImpl: () => createMockSupabaseClient("user-123"),
    envGet: (key) =>
      ({
        AI_CHAT_BASE_URL: "https://ai.example.com",
        SUPABASE_URL: "https://supabase.example.com",
        SUPABASE_ANON_KEY: "anon-key",
      }[key]),
    req: new Request("https://example.com/chat", {
      method: "POST",
      body: "{invalid-json",
      headers: {
        Authorization: "Bearer token.test.value",
        "Content-Type": "application/json",
      },
    }),
  });

  assertExists(result.response);
  assertEquals(result.context, undefined);
  assertEquals(result.response!.status, 400);
  assertEquals(await result.response!.text(), '{"error":"Invalid request body. Expected JSON."}');
});
