import { describe, expect, it } from "vitest";
import { toMarkdownHardBreaks } from "@/lib/markdownLineBreaks";

describe("toMarkdownHardBreaks", () => {
  it("converte \\n simples em quebra dura de Markdown (dois espaços + \\n)", () => {
    const input = "✅ Avaliação registrada!\n📍 Serviço: CEU CEI BUTANTA\n⭐ Nota geral: ★★★★★";
    const out = toMarkdownHardBreaks(input);
    expect(out).toBe(
      "✅ Avaliação registrada!  \n📍 Serviço: CEU CEI BUTANTA  \n⭐ Nota geral: ★★★★★",
    );
    // cada quebra vira "espaço-espaço-\n" (renderiza como <br> no chat)
    expect(out.split("  \n").length).toBe(3);
  });

  it("preserva texto sem quebras e trata vazio", () => {
    expect(toMarkdownHardBreaks("uma linha só")).toBe("uma linha só");
    expect(toMarkdownHardBreaks("")).toBe("");
  });
});
