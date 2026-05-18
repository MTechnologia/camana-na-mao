import { describe, expect, it } from "vitest";
import { updatePasswordSchema, validatePasswordPolicy } from "./validations";

describe("validatePasswordPolicy", () => {
  it("aceita senha que atende todos os requisitos", () => {
    expect(validatePasswordPolicy("Abcdef1!")).toBe(true);
  });

  it("rejeita senha curta ou sem complexidade", () => {
    expect(validatePasswordPolicy("abcdef1!")).toBe(false);
    expect(validatePasswordPolicy("Abcdef1")).toBe(false);
    expect(validatePasswordPolicy("Ab1!")).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("exige confirmação igual", () => {
    const result = updatePasswordSchema.safeParse({
      password: "Abcdef1!",
      confirmPassword: "Abcdef1?",
    });
    expect(result.success).toBe(false);
  });

  it("valida par válido", () => {
    const result = updatePasswordSchema.safeParse({
      password: "Abcdef1!",
      confirmPassword: "Abcdef1!",
    });
    expect(result.success).toBe(true);
  });
});
