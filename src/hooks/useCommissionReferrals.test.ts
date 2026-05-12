import { describe, it, expect } from "vitest";
import {
  COMMISSION_REFERRAL_MIN_JUSTIFICATION,
  JustificationTooShortError,
} from "./useCommissionReferrals";

/**
 * HU-10.2 — Testes da validação de justificativa.
 *
 * Não exercita a integração com Supabase (requer mock pesado); foca na
 * regra que está sempre exposta ao consumidor.
 */

describe("COMMISSION_REFERRAL_MIN_JUSTIFICATION", () => {
  it("define o limite documentado (20)", () => {
    expect(COMMISSION_REFERRAL_MIN_JUSTIFICATION).toBe(20);
  });
});

describe("JustificationTooShortError", () => {
  it("estende Error com nome dedicado", () => {
    const err = new JustificationTooShortError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("JustificationTooShortError");
  });

  it("mensagem menciona o número mínimo de caracteres", () => {
    const err = new JustificationTooShortError();
    expect(err.message).toContain(String(COMMISSION_REFERRAL_MIN_JUSTIFICATION));
  });
});
