import { describe, expect, it } from "vitest";
import {
  CHAMBER_FEEDBACK_NATURE_VALUES,
  looksLikeChamberFeedbackNatureQuestion,
} from "@/lib/chamberFeedbackPrompts";

describe("CHAMBER_FEEDBACK_NATURE_VALUES", () => {
  it("oferece reclamação, sugestão e elogio — sem 'duvida'", () => {
    expect(CHAMBER_FEEDBACK_NATURE_VALUES).toEqual(["reclamacao", "sugestao", "elogio"]);
    expect(CHAMBER_FEEDBACK_NATURE_VALUES).not.toContain("duvida");
  });
});

describe("looksLikeChamberFeedbackNatureQuestion", () => {
  it("reconhece a pergunta de tipo de feedback sobre o vereador", () => {
    expect(
      looksLikeChamberFeedbackNatureQuestion(
        "Perfeito! Entendido que você deseja falar sobre o vereador Alessandro Guedes (PT). " +
          "Agora, me conte: esse seu feedback é uma reclamação, uma sugestão ou um elogio?",
      ),
    ).toBe(true);
  });

  it("reconhece variação com 'vereadora' e sem a palavra 'feedback'", () => {
    expect(
      looksLikeChamberFeedbackNatureQuestion(
        "Sobre a vereadora, isso é uma reclamação, sugestão ou elogio?",
      ),
    ).toBe(true);
  });

  it("NÃO dispara na pergunta genérica de relato urbano (sem contexto de câmara)", () => {
    expect(
      looksLikeChamberFeedbackNatureQuestion(
        "Antes de começarmos, qual é o tipo do seu relato sobre a cidade?",
      ),
    ).toBe(false);
  });

  it("NÃO dispara em texto sem as três opções", () => {
    expect(
      looksLikeChamberFeedbackNatureQuestion("Sobre qual vereador você quer falar?"),
    ).toBe(false);
    expect(looksLikeChamberFeedbackNatureQuestion("")).toBe(false);
  });
});
