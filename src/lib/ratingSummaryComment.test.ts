import { describe, expect, it } from "vitest";
import {
  forceReplaceRatingComment,
  parseRatingSummaryComment,
  replaceRatingSummaryComment,
} from "./ratingSummaryComment";

describe("ratingSummaryComment", () => {
  const toolTemplate = `[RATING_CREATED:x]\n\n✅ **Avaliação registrada!**\n\n📝 **Comentário:** Teste\n\nObrigado!`;

  it("parseRatingSummaryComment extrai o texto (template tool)", () => {
    expect(parseRatingSummaryComment(toolTemplate)).toBe("Teste");
  });

  it("replaceRatingSummaryComment atualiza o template tool", () => {
    const next = replaceRatingSummaryComment(toolTemplate, "Novo texto");
    expect(next).toContain("📝 **Comentário:** Novo texto");
    expect(parseRatingSummaryComment(next)).toBe("Novo texto");
  });

  it("substitui sem emoji (só **Comentário:**)", () => {
    const raw = `[RATING_CREATED:x]\n\n**Comentário:** velho\n\nfim`;
    const next = replaceRatingSummaryComment(raw, "novo");
    expect(next).toContain("**Comentário:** novo");
  });

  it("substitui linha 📝 Comentário: sem negrito", () => {
    const raw = `algo\n📝 Comentário: x\nfim`;
    expect(replaceRatingSummaryComment(raw, "y")).toContain("📝 Comentário: y");
  });

  it("forceReplaceRatingComment recupera formato estranho (só 'Comentário:' na linha)", () => {
    const raw = `[RATING_CREATED:x]\n\n✅ ok\n\nComentário: antigo\n\nfim`;
    const next = forceReplaceRatingComment(raw, "novo texto ok");
    expect(next).toContain("📝 **Comentário:** novo texto ok");
    expect(parseRatingSummaryComment(next)).toBe("novo texto ok");
  });
});
