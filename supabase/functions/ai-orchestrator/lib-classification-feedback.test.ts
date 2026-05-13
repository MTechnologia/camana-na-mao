import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  extractCategoryKeywords,
  inferTransportClassificationSource,
  inferUrbanClassificationSource,
  mapLabelToCategory,
} from "./lib-classification-feedback.ts";

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
