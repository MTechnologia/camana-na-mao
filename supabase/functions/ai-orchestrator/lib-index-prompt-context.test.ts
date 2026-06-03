import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildPromptContextAndTools,
  detectServiceLocationDuvida,
  extractServiceSearchTerm,
} from "./lib-index-prompt-context.ts";

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

// Regressão: "Onde fica a UBS Vila Maria?" feita como *dúvida* urbana caía na
// base da Câmara e respondia genericamente ("a base da Câmara não tem o
// endereço — procure a Prefeitura/156/Busca Saúde"). Deve ser reconhecida como
// pergunta de localização de serviço público (→ find_nearby_services).
Deno.test("detectServiceLocationDuvida: reconhece perguntas de localização de serviço", () => {
  assertEquals(detectServiceLocationDuvida("Onde fica a UBS Vila Maria?"), "ubs");
  assertEquals(detectServiceLocationDuvida("Qual a escola mais próxima?"), "school");
  assertEquals(detectServiceLocationDuvida("Onde fica o hospital mais perto?"), "hospital");
  assertEquals(detectServiceLocationDuvida("endereço da creche no Tatuapé"), "daycare");
  assertEquals(detectServiceLocationDuvida("como chego na biblioteca?"), "library");
});

Deno.test("detectServiceLocationDuvida: dúvida institucional/sem localização → null", () => {
  assertEquals(detectServiceLocationDuvida("Como funciona a Câmara Municipal?"), null);
  assertEquals(detectServiceLocationDuvida("O que é uma UBS?"), null); // não pergunta onde fica
  assertEquals(detectServiceLocationDuvida("Quero saber sobre o transporte público"), null);
  assertEquals(detectServiceLocationDuvida(""), null);
});

Deno.test("detectServiceLocationDuvida: tolera o typo 'usb' → ubs", () => {
  assertEquals(detectServiceLocationDuvida("Onde fica a usb vila maria"), "ubs");
});

Deno.test("extractServiceSearchTerm: limpa pergunta e corrige usb→ubs", () => {
  assertEquals(extractServiceSearchTerm("Onde fica a usb vila maria"), "ubs vila maria");
  assertEquals(extractServiceSearchTerm("Onde fica a UBS Vila Maria?"), "ubs vila maria");
  assertEquals(extractServiceSearchTerm("endereço do hospital das clínicas"), "hospital clínicas");
});

Deno.test("buildPromptContextAndTools: dúvida 'Onde fica a UBS Vila Maria?' orienta find_nearby_services (não deflecte p/ Câmara)", async () => {
  let kbCalled = false;
  const result = await buildPromptContextAndTools({
    accumulatedFields: {
      report_nature: "duvida",
      description: "Onde fica a UBS Vila Maria?",
      category: "outro",
    },
    aiChatModel: "google/gemini-test",
    collectionIntent: { type: "urban_report", fields: {} },
    dynamicSystemPrompt: "base",
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com/projects/p1/locations/us-central1",
    lastUserMessage: "Onde fica a UBS Vila Maria?",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      executeTool: async () => ({ message: "" }),
      getUltimasNoticias: async () => "",
      isQuestionAboutProximasOuQuaisAudiencias: () => false,
      isCamaraFuncionamentoInternoQuery: () => false,
      searchKnowledgeBase: async () => "não deve ser chamado",
      searchKnowledgeBaseForUrbanDuvida: async () => {
        kbCalled = true;
        return { text: "", hasRelevantHits: false };
      },
      isBusInformationalQuery: () => false,
      tools: [
        { function: { name: "search_knowledge_base" } },
        { function: { name: "find_nearby_services" } },
        { function: { name: "other_tool" } },
      ],
    } as any,
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    vertexRagCorpus: "",
    vertexRagDatastore: "",
  });

  // Instrui o modelo a buscar o endereço via find_nearby_services…
  assertStringIncludes(result.dynamicSystemPrompt, "[Dúvida sobre localização de serviço público]");
  assertStringIncludes(result.dynamicSystemPrompt, "find_nearby_services");
  assertStringIncludes(result.dynamicSystemPrompt, 'service_type="ubs"');
  // …e NÃO injeta a deflexão da base da Câmara.
  assertEquals(result.dynamicSystemPrompt.includes("[Contexto dúvida urbana — sem trecho na base]"), false);
  // A busca na base da Câmara nem é chamada para esse tipo de pergunta.
  assertEquals(kbCalled, false);
  // find_nearby_services continua disponível como ferramenta.
  assertEquals(
    // deno-lint-ignore no-explicit-any
    (result.effectiveTools as any[]).some((tool) => tool.function?.name === "find_nearby_services"),
    true,
  );
});

Deno.test("buildPromptContextAndTools: aterrissa o endereço REAL do public_services (impede alucinação)", async () => {
  let askedTerm = "";
  const realAddress = "Ubs Vila Maria - Dr. Luiz Paulo Gnecco\n📍 R. ANDRÉ DA FONSECA, 70, VILA MUNHOZ\n📞 3475-5203";
  const result = await buildPromptContextAndTools({
    accumulatedFields: {
      report_nature: "duvida",
      description: "Onde fica a usb vila maria", // typo usb + sem acento, como o cidadão digitou
      category: "outro",
    },
    aiChatModel: "google/gemini-test",
    collectionIntent: { type: "urban_report", fields: {} },
    dynamicSystemPrompt: "base",
    finalAiApiKey: "",
    finalAiBaseUrl: "https://example.com/projects/p1/locations/us-central1",
    lastUserMessage: "Onde fica a usb vila maria",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      executeTool: async () => ({ message: "" }),
      getUltimasNoticias: async () => "",
      isQuestionAboutProximasOuQuaisAudiencias: () => false,
      isCamaraFuncionamentoInternoQuery: () => false,
      searchKnowledgeBase: async () => "não deve ser chamado",
      searchKnowledgeBaseForUrbanDuvida: async () => ({ text: "", hasRelevantHits: false }),
      getServiceAddressByName: async (_supabase: unknown, term: string) => {
        askedTerm = term;
        return realAddress;
      },
      isBusInformationalQuery: () => false,
      tools: [
        { function: { name: "search_knowledge_base" } },
        { function: { name: "find_nearby_services" } },
      ],
    } as any,
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    vertexRagCorpus: "",
    vertexRagDatastore: "",
  });

  // Buscou pelo termo limpo (usb→ubs, sem palavras de pergunta).
  assertEquals(askedTerm, "ubs vila maria");
  // O endereço REAL é injetado e o modelo é proibido de inventar.
  assertStringIncludes(result.dynamicSystemPrompt, "R. ANDRÉ DA FONSECA, 70");
  assertStringIncludes(result.dynamicSystemPrompt, "[Endereço oficial do serviço público — base do app]");
  assertStringIncludes(result.dynamicSystemPrompt, "Proibido");
  // Não injeta a deflexão da Câmara nem orienta find_nearby_services (já temos o endereço).
  assertEquals(result.dynamicSystemPrompt.includes("[Contexto dúvida urbana — sem trecho na base]"), false);
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
