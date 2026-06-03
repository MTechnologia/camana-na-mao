import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildPromptContextAndTools } from "./lib-index-prompt-context.ts";

Deno.test("buildPromptContextAndTools injeta KB da Câmara e remove search_knowledge_base", async () => {
  const result = await buildPromptContextAndTools({
    accumulatedFields: {},
    aiChatModel: "google/gemini-test",
    collectionIntent: { type: "general", fields: {} },
    dynamicSystemPrompt: "base",
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com/projects/p1/locations/us-central1",
    lastUserMessage: "Como funciona a Câmara Municipal?",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      executeTool: async () => ({ message: "" }),
      getUltimasNoticias: async () => "",
      isQuestionAboutProximasOuQuaisAudiencias: () => false,
      isCamaraFuncionamentoInternoQuery: () => true,
      searchKnowledgeBase: async () => "Trecho específico da Câmara",
      isBusInformationalQuery: () => false,
      tools: [
        { function: { name: "search_knowledge_base" } },
        { function: { name: "other_tool" } },
      ],
    } as any,
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    vertexRagCorpus: "",
    vertexRagDatastore: "",
  });

  assertStringIncludes(result.dynamicSystemPrompt, "[Contexto da base de conhecimento da Câmara (Supabase)]");
  assertEquals(
    // deno-lint-ignore no-explicit-any
    (result.effectiveTools as any[]).map((tool) => tool.function?.name),
    ["other_tool"],
  );
});

Deno.test("buildPromptContextAndTools: dúvida urbana sem KB relevante injeta anti-dump e remove search_knowledge_base", async () => {
  const result = await buildPromptContextAndTools({
    accumulatedFields: {
      report_nature: "duvida",
      description:
        "Gostaria de saber como é feito o planejamento para o policiamento em eventos na cidade de São Paulo",
      category: "outro",
    },
    aiChatModel: "google/gemini-test",
    collectionIntent: { type: "urban_report", fields: {} },
    dynamicSystemPrompt: "base",
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com/projects/p1/locations/us-central1",
    lastUserMessage: "Gostaria de saber como é feito o planejamento para o policiamento em eventos",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      executeTool: async () => ({ message: "" }),
      getUltimasNoticias: async () => "",
      isQuestionAboutProximasOuQuaisAudiencias: () => false,
      isCamaraFuncionamentoInternoQuery: () => false,
      searchKnowledgeBase: async () => "não deve ser chamado",
      searchKnowledgeBaseForUrbanDuvida: async () => ({ text: "", hasRelevantHits: false }),
      isBusInformationalQuery: () => false,
      tools: [
        { function: { name: "search_knowledge_base" } },
        { function: { name: "other_tool" } },
      ],
    } as any,
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    vertexRagCorpus: "",
    vertexRagDatastore: "",
  });

  assertStringIncludes(result.dynamicSystemPrompt, "[Contexto dúvida urbana — sem trecho na base]");
  assertStringIncludes(result.dynamicSystemPrompt, "Proibido");
  assertEquals(
    // deno-lint-ignore no-explicit-any
    (result.effectiveTools as any[]).map((tool) => tool.function?.name),
    ["other_tool"],
  );
});

Deno.test("buildPromptContextAndTools normaliza modelo Vertex para generateContent sem prefixo google", async () => {
  let capturedUrl = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    capturedUrl = String(input);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Trecho vindo do RAG" }] } }],
    }), { status: 200 });
  }) as typeof fetch;

  try {
    Deno.env.set("AI_ENABLE_VERTEX_RAG", "1");
    const result = await buildPromptContextAndTools({
      accumulatedFields: {},
      aiChatModel: "google/gemini-3-flash",
      collectionIntent: { type: "general", fields: {} },
      dynamicSystemPrompt: "base",
      finalAiApiKey: "vertex-token",
      finalAiBaseUrl: "https://southamerica-east1-aiplatform.googleapis.com/v1/projects/p1/locations/southamerica-east1/endpoints/openapi",
      lastUserMessage: "Qual o horário da Câmara?",
      // deno-lint-ignore no-explicit-any
      lib: {
        corsHeaders: {},
        executeTool: async () => ({ message: "" }),
        getUltimasNoticias: async () => "",
        isQuestionAboutProximasOuQuaisAudiencias: () => false,
        isCamaraFuncionamentoInternoQuery: () => false,
        searchKnowledgeBase: async () => "",
        isBusInformationalQuery: () => false,
        tools: [{ function: { name: "search_knowledge_base" } }],
      } as any,
      // deno-lint-ignore no-explicit-any
      supabase: {} as any,
      userId: "user-1",
      vertexRagCorpus: "",
      vertexRagDatastore: "datastore-1",
    });

    assertEquals(
      capturedUrl,
      "https://southamerica-east1-aiplatform.googleapis.com/v1beta1/projects/p1/locations/southamerica-east1/publishers/google/models/gemini-3-flash:generateContent",
    );
    assertStringIncludes(result.dynamicSystemPrompt, "[Contexto da base de conhecimento da Câmara (Vertex RAG)]");
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("AI_ENABLE_VERTEX_RAG");
  }
});

Deno.test("buildPromptContextAndTools usa host aiplatform.googleapis.com (sem prefixo) para location global", async () => {
  // Regressão do bug 2026-06-01-vertex-rag-generatecontent-404:
  // location `global` deve usar `aiplatform.googleapis.com`, não `global-aiplatform...`.
  let capturedUrl = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    capturedUrl = String(input);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Trecho vindo do RAG" }] } }],
    }), { status: 200 });
  }) as typeof fetch;

  try {
    Deno.env.set("AI_ENABLE_VERTEX_RAG", "1");
    const result = await buildPromptContextAndTools({
      accumulatedFields: {},
      aiChatModel: "google/gemini-3.1-flash-lite-preview",
      collectionIntent: { type: "general", fields: {} },
      dynamicSystemPrompt: "base",
      finalAiApiKey: "vertex-token",
      finalAiBaseUrl:
        "https://aiplatform.googleapis.com/v1/projects/arcane-atom-480020-f6/locations/global/endpoints/openapi",
      lastUserMessage: "Qual o telefone de contato da Câmara?",
      // deno-lint-ignore no-explicit-any
      lib: {
        corsHeaders: {},
        executeTool: async () => ({ message: "" }),
        getUltimasNoticias: async () => "",
        isQuestionAboutProximasOuQuaisAudiencias: () => false,
        isCamaraFuncionamentoInternoQuery: () => false,
        searchKnowledgeBase: async () => "",
        isBusInformationalQuery: () => false,
        tools: [{ function: { name: "search_knowledge_base" } }],
      } as any,
      // deno-lint-ignore no-explicit-any
      supabase: {} as any,
      userId: "user-1",
      vertexRagCorpus: "",
      vertexRagDatastore: "camara-na-mao-rag_1770999938229",
    });

    assertEquals(
      capturedUrl,
      "https://aiplatform.googleapis.com/v1beta1/projects/arcane-atom-480020-f6/locations/global/publishers/google/models/gemini-3.1-flash-lite-preview:generateContent",
    );
    assertStringIncludes(result.dynamicSystemPrompt, "[Contexto da base de conhecimento da Câmara (Vertex RAG)]");
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("AI_ENABLE_VERTEX_RAG");
  }
});
