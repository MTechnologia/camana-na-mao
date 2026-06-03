import { describe, expect, it } from "vitest";
import { withStructuredListLineBreaks } from "@/lib/chatLineBreaks";

describe("withStructuredListLineBreaks", () => {
  it("quebra paradas de ônibus (bullets) em uma por linha", () => {
    const input = "**Paradas encontradas:**\n• **Afonso Braz** (cód. 1)\n• **Agarum** (cód. 2)";
    const out = withStructuredListLineBreaks(input);
    // cada bullet vira quebra hard (dois espaços + \n)
    expect(out).toContain("  \n• **Afonso Braz**");
    expect(out).toContain("  \n• **Agarum**");
  });

  it("quebra linhas com emoji (estilo resumo) em uma por linha", () => {
    const input = "🚌 Linha: 1017-10\n📅 Data: 2026-05-29\n🕐 Horário: 10:16";
    const out = withStructuredListLineBreaks(input);
    expect(out).toContain("🚌 Linha: 1017-10  \n📅 Data:");
    expect(out).toContain("  \n🕐 Horário:");
  });

  it("não altera prosa comum (sem marcadores)", () => {
    const input = "Olá! Como posso ajudar?\nPosso registrar um relato urbano ou de transporte.";
    expect(withStructuredListLineBreaks(input)).toBe(input);
  });

  it("não altera quando há só 1 item de lista", () => {
    const input = "Resultado:\n• item único";
    expect(withStructuredListLineBreaks(input)).toBe(input);
  });

  it("texto sem quebras de linha fica intacto", () => {
    const input = "• a • b • c numa linha só";
    expect(withStructuredListLineBreaks(input)).toBe(input);
  });
});
