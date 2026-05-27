import { describe, expect, it } from "vitest";
import {
  aggregateServiceRatingStars,
  buildServiceRatingDimensionsUserMessage,
  isCompleteServiceRatingDimensions,
  parseRatingDimensionsFromMessage,
} from "./serviceRatingDimensions";

const completeDimensions = {
  atendimento: 5,
  limpeza: 4,
  infraestrutura: 3,
  tempo_espera: 2,
};

describe("serviceRatingDimensions", () => {
  it("valida somente dimensoes completas com notas inteiras de 1 a 5", () => {
    expect(isCompleteServiceRatingDimensions(completeDimensions)).toBe(true);

    expect(isCompleteServiceRatingDimensions(null)).toBe(false);
    expect(isCompleteServiceRatingDimensions("5")).toBe(false);
    expect(isCompleteServiceRatingDimensions({ atendimento: 5 })).toBe(false);
    expect(
      isCompleteServiceRatingDimensions({
        ...completeDimensions,
        limpeza: 0,
      }),
    ).toBe(false);
    expect(
      isCompleteServiceRatingDimensions({
        ...completeDimensions,
        infraestrutura: 4.5,
      }),
    ).toBe(false);
  });

  it("agrega as dimensoes em uma nota geral arredondada", () => {
    expect(aggregateServiceRatingStars(completeDimensions)).toBe(4);
    expect(
      aggregateServiceRatingStars({
        atendimento: 1,
        limpeza: 2,
        infraestrutura: 2,
        tempo_espera: 2,
      }),
    ).toBe(2);
  });

  it("parseia o marcador de dimensoes e rejeita mensagens invalidas", () => {
    const message = buildServiceRatingDimensionsUserMessage(completeDimensions);

    expect(parseRatingDimensionsFromMessage(message)).toEqual(completeDimensions);
    expect(parseRatingDimensionsFromMessage("Mensagem sem marcador")).toBeNull();
    expect(parseRatingDimensionsFromMessage("[RATING_DIMENSIONS:{")).toBeNull();
    expect(parseRatingDimensionsFromMessage("[RATING_DIMENSIONS:{\"atendimento\":5}]")).toBeNull();
    expect(
      parseRatingDimensionsFromMessage(
        '[RATING_DIMENSIONS:{"atendimento":5,"limpeza":4,"infraestrutura":3,"tempo_espera":6}]',
      ),
    ).toBeNull();
  });
});
