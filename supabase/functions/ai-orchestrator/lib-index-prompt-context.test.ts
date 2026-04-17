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
