import { describe, expect, it } from "vitest";
import {
  registerCredentialsSchema,
  updatePasswordSchema,
  validatePasswordPolicy,
} from "./validations";

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

describe("registerCredentialsSchema", () => {
  it("valida e-mail, telefone e senha juntos", () => {
    const result = registerCredentialsSchema.safeParse({
      fullName: "Maria Silva",
      email: "maria@exemplo.com.br",
      phone: "11987654321",
      password: "Abcdef1!",
      confirmPassword: "Abcdef1!",
    });
    expect(result.success).toBe(true);
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
