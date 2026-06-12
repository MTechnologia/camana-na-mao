import { describe, it, expect } from "vitest";

import { registerStep1Schema } from "./validations";

const fullName = registerStep1Schema.shape.fullName;

describe("registerStep1Schema.fullName — numerais permitidos no nome", () => {
  it("aceita nome com numeral", () => {
    expect(fullName.safeParse("Maria Silva 2").success).toBe(true);
    expect(fullName.safeParse("João 3 Souza").success).toBe(true);
  });

  it("continua aceitando nome comum sem número", () => {
    expect(fullName.safeParse("Maria Silva").success).toBe(true);
  });

  it("rejeita nome implausível (uma palavra só, só números ou símbolos)", () => {
    expect(fullName.safeParse("Maria").success).toBe(false);
    expect(fullName.safeParse("123 456").success).toBe(false);
    expect(fullName.safeParse("@@@ ###").success).toBe(false);
  });
});
