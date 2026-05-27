import { describe, expect, it } from "vitest";
import { shouldOfferRatingCommentReview } from "./shouldOfferRatingCommentReview";

describe("shouldOfferRatingCommentReview", () => {
  it("oferece revisao quando ha nota geral, pedido de comentario e rascunho suficiente", () => {
    expect(
      shouldOfferRatingCommentReview(
        { rating_stars: 4 },
        "Descreva sua experiencia ou pule o comentario.",
        "Atendimento rapido",
      ),
    ).toBe(true);
  });

  it("tambem aceita avaliacao por dimensoes completa", () => {
    expect(
      shouldOfferRatingCommentReview(
        {
          rating_dimensions: {
            atendimento: 4,
            limpeza: 5,
            infraestrutura: 4,
            tempo_espera: 3,
          },
        },
        "[field_request:rating_text]",
        "Foi bom",
      ),
    ).toBe(true);
  });

  it("nao oferece sem pedido do assistente, com rascunho curto ou comentario ja coletado", () => {
    expect(shouldOfferRatingCommentReview({ rating_stars: 4 }, "Obrigado pela nota.", "Muito bom")).toBe(false);
    expect(shouldOfferRatingCommentReview({ rating_stars: 4 }, "Descreva sua experiencia.", "ok")).toBe(false);
    expect(
      shouldOfferRatingCommentReview(
        { rating_stars: 4, rating_text: "Atendimento rapido" },
        "Descreva sua experiencia.",
        "Atendimento rapido",
      ),
    ).toBe(false);
  });
});
