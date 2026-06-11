import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  detectEmergingCategory,
  extractCategoryKeywords,
  inferTransportClassificationSource,
  inferUrbanClassificationSource,
  mapLabelToCategory,
} from "./lib-classification-feedback.ts";

// Mock encadeável do query builder do supabase para detectEmergingCategory/createDynamicCategory.
function makeDynamicCategoriesMock(existing: Record<string, unknown> | null) {
  const inserts: Record<string, unknown>[] = [];
  let updated = false;
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: existing, error: null });
  builder.insert = (row: Record<string, unknown>) => {
    inserts.push(row);
    return Promise.resolve({ data: null, error: null });
  };
  builder.update = () => {
    updated = true;
    return builder;
  };
  // deno-lint-ignore no-explicit-any
  const client = { from: () => builder } as any;
  return { client, inserts, wasUpdated: () => updated };
}

Deno.test("mapLabelToCategory: mapeia labels semânticos para categorias urbanas", () => {
  assertEquals(mapLabelToCategory("Poste caído na rua"), "iluminacao");
  assertEquals(mapLabelToCategory("Lixo acumulado"), "lixo");
  assertEquals(mapLabelToCategory(""), null);
});

Deno.test("classification feedback helpers: keywords e origem continuam estáveis", () => {
  assertEquals(
    extractCategoryKeywords("Há muito entulho espalhado e descarte irregular na calçada").slice(0, 4),
    ["muito", "entulho", "espalhado", "descarte"],
  );
  assertEquals(inferUrbanClassificationSource({ _from_feedback: true }), "feedback_loop");
  assertEquals(
    inferTransportClassificationSource({ _transport_classification_route: "keyword_extract" }),
    "keyword_extract",
  );
});

Deno.test("detectEmergingCategory: cria categoria emergente nova (corrige dynamic_categories zerado)", async () => {
  const mock = makeDynamicCategoriesMock(null);
  const res = await detectEmergingCategory(
    "vi uma pichação enorme no muro da escola",
    "outro",
    mock.client,
  );
  assertEquals(res.shouldCreate, true);
  assertEquals(res.suggestedKey, "pichacao");
  assertEquals(mock.inserts.length, 1);
  assertEquals(mock.inserts[0].category_key, "pichacao");
  assertEquals(mock.inserts[0].status, "pending");
});

Deno.test("detectEmergingCategory: incrementa uso quando já existe (não duplica)", async () => {
  const mock = makeDynamicCategoriesMock({ id: "x", usage_count: 2 });
  const res = await detectEmergingCategory(
    "patinete abandonado jogado na calçada",
    "outro",
    mock.client,
  );
  assertEquals(res.shouldCreate, false);
  assertEquals(mock.wasUpdated(), true);
  assertEquals(mock.inserts.length, 0);
});

Deno.test("detectEmergingCategory: descrição comum não cria categoria", async () => {
  const mock = makeDynamicCategoriesMock(null);
  const res = await detectEmergingCategory("buraco grande na rua", "via_publica", mock.client);
  assertEquals(res.shouldCreate, false);
  assertEquals(mock.inserts.length, 0);
});
