import { describe, expect, it } from "vitest";
import { shouldOfferRatingReferral } from "./shouldOfferRatingReferral";

const completeGoodDimensions = {
  atendimento: 5,
  limpeza: 4,
  infraestrutura: 5,
  tempo_espera: 4,
};

describe("shouldOfferRatingReferral", () => {
  it("oferece encaminhamento quando a nota geral e baixa", () => {
    expect(shouldOfferRatingReferral(1, completeGoodDimensions)).toBe(true);
    expect(shouldOfferRatingReferral(2, completeGoodDimensions)).toBe(true);
  });

  it("oferece encaminhamento quando alguma dimensao completa e baixa", () => {
    expect(
      shouldOfferRatingReferral(5, {
        ...completeGoodDimensions,
        tempo_espera: 2,
      }),
    ).toBe(true);
  });

  it("nao oferece para nota alta sem dimensao baixa ou com dimensoes incompletas", () => {
    expect(shouldOfferRatingReferral(5, completeGoodDimensions)).toBe(false);
    expect(shouldOfferRatingReferral(5, { atendimento: 1 })).toBe(false);
    expect(shouldOfferRatingReferral(0, completeGoodDimensions)).toBe(false);
  });
});
