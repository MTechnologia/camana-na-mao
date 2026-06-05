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

  it("quebra lista numerada (estações/serviços) em uma por linha", () => {
    const input =
      "Aqui estão as estações de trem (CPTM) mais próximas de você:\n1. Estação Cidade Jardim — a 712 m\n2. Estação Vila Olímpia — a 1,1 km\n3. Estação Berrini — a 2,2 km";
    const out = withStructuredListLineBreaks(input);
    expect(out).toContain("  \n1. Estação Cidade Jardim");
    expect(out).toContain("  \n2. Estação Vila Olímpia");
    expect(out).toContain("  \n3. Estação Berrini");
  });

  it("quebra serviços numerados com 📍 (um item por linha)", () => {
    const input =
      "Aqui estão as opções:\n1. Ponto A (São Paulo)\n📍 Rua 1, 10\n2. Ponto B (São Paulo)\n📍 Rua 2, 20";
    const out = withStructuredListLineBreaks(input);
    expect(out).toContain("  \n1. Ponto A");
    expect(out).toContain("  \n📍 Rua 1, 10");
    expect(out).toContain("  \n2. Ponto B");
  });

  it("não confunde decimais/medidas (3,4 km) com itens numerados", () => {
    const input = "Distância total: 3,4 km\n• ponto único";
    expect(withStructuredListLineBreaks(input)).toBe(input);
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
