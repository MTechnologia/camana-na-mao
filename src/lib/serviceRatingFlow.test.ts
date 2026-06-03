import { describe, expect, it } from "vitest";
import { conversationUsesDimensionOnlyRating } from "./serviceRatingFlow";

describe("conversationUsesDimensionOnlyRating", () => {
  it("detecta fluxo por dimensões", () => {
    expect(
      conversationUsesDimensionOnlyRating([
        { role: "assistant", content: "[FIELD_REQUEST:dim_atendimento] Avalie" },
      ]),
    ).toBe(true);
  });

  it("retorna false sem marcadores de dimensão", () => {
    expect(
      conversationUsesDimensionOnlyRating([
        { role: "assistant", content: "Olá, como posso ajudar?" },
      ]),
    ).toBe(false);
  });
});
