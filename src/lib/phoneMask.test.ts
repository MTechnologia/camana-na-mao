import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone, unformatPhone } from "./phoneMask";

describe("phoneMask", () => {
  it("formata telefone fixo e celular brasileiros", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("remove caracteres nao numericos e limita a onze digitos", () => {
    expect(unformatPhone("(11) 98765-4321")).toBe("11987654321");
    expect(formatPhone("+55 (11) 98765-4321 ramal 123")).toBe("(55) 11987-6543");
  });

  it("valida somente numeros completos com dez ou onze digitos", () => {
    expect(isValidPhone("(11) 3333-4444")).toBe(true);
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("119876543")).toBe(false);
    expect(isValidPhone("119876543210")).toBe(false);
  });
});
