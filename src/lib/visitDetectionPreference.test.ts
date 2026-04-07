import { describe, expect, it } from "vitest";
import { visitDetectionAllowedFromPreference } from "./visitDetectionPreference";

describe("visitDetectionAllowedFromPreference", () => {
  it("bloqueia quando o usuário desligou explicitamente (false)", () => {
    expect(visitDetectionAllowedFromPreference(false)).toBe(false);
  });

  it("permite quando ligado (true)", () => {
    expect(visitDetectionAllowedFromPreference(true)).toBe(true);
  });

  it("permite quando indefinido — padrão / linha ainda não carregada", () => {
    expect(visitDetectionAllowedFromPreference(undefined)).toBe(true);
    expect(visitDetectionAllowedFromPreference(null)).toBe(true);
  });
});
