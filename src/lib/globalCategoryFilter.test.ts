import { describe, expect, it } from "vitest";
import {
  categoryDbValuesForRpc,
  hasCategoryFilterTargets,
  resolveGlobalCategoryFilter,
} from "@/lib/globalCategoryFilter";

describe("resolveGlobalCategoryFilter", () => {
  it("all não aplica recorte", () => {
    const slice = resolveGlobalCategoryFilter("all");
    expect(slice.isAll).toBe(true);
    expect(hasCategoryFilterTargets(slice)).toBe(false);
  });

  it("mobilidade inclui transporte e vias urbanas", () => {
    const slice = resolveGlobalCategoryFilter("mobilidade");
    expect(slice.isAll).toBe(false);
    expect(slice.urbanCategories).toContain("via_publica");
    expect(slice.transportSubcategories).toContain("atraso");
    expect(categoryDbValuesForRpc(slice).length).toBeGreaterThan(0);
  });

  it("saude inclui tipos de equipamento de saúde", () => {
    const slice = resolveGlobalCategoryFilter("saude");
    expect(slice.publicServiceTypes).toEqual(expect.arrayContaining(["ubs", "hospital"]));
  });
});
