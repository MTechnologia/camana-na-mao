import { describe, expect, it } from "vitest";
import { TRANSPORT_SUBCATEGORIES } from "@/lib/reportFieldConfig";

describe("TRANSPORT_SUBCATEGORIES", () => {
  const expectedTypes = [
    "atraso",
    "lotacao",
    "seguranca",
    "acessibilidade",
    "limpeza",
    "conducao",
    "outro",
  ];

  it("cobre todos os tipos de problema de transporte", () => {
    for (const type of expectedTypes) {
      expect(Array.isArray(TRANSPORT_SUBCATEGORIES[type])).toBe(true);
      expect(TRANSPORT_SUBCATEGORIES[type].length).toBeGreaterThan(0);
    }
  });

  it("usa valores de subcategoria sem duplicidade por tipo", () => {
    for (const type of expectedTypes) {
      const values = TRANSPORT_SUBCATEGORIES[type].map((item) => item.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
