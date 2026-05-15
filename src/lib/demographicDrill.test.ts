import { describe, expect, it } from "vitest";
import {
  NOT_INFORMED,
  resolveAgeGroupKey,
  resolveGenderKey,
  resolveRaceKey,
  resolveSocialClassKey,
  genderDbValues,
} from "./demographicDrill";

describe("demographicDrill", () => {
  it("resolve rótulos de exibição para chaves do banco", () => {
    expect(resolveGenderKey("Masculino")).toBe("masculino");
    expect(resolveRaceKey("Branca")).toBe("branca");
    expect(resolveSocialClassKey("Classe AB")).toBe("AB");
    expect(resolveAgeGroupKey("35-44")).toBe("35_44");
  });

  it("mantém chaves já canônicas", () => {
    expect(resolveGenderKey("masculino")).toBe("masculino");
    expect(resolveRaceKey("branca")).toBe("branca");
  });

  it("resolve not_informed", () => {
    expect(resolveGenderKey("Não informado")).toBe(NOT_INFORMED);
    expect(resolveRaceKey(NOT_INFORMED)).toBe(NOT_INFORMED);
  });

  it("agrupa aliases de prefiro não informar", () => {
    expect(genderDbValues("prefiro_nao_informar")).toContain("prefiro_nao_dizer");
    expect(genderDbValues("prefiro_nao_informar")).toContain("prefer_not_to_say");
  });
});
