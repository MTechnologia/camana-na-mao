import { describe, expect, it } from "vitest";
import { formatUserMessageHidingGpsLine } from "./formatUserMessageHidingGpsLine";

describe("formatUserMessageHidingGpsLine", () => {
  it("remove a linha tecnica de GPS e preserva o texto visivel", () => {
    const result = formatUserMessageHidingGpsLine(
      "Buraco grande na calcada\nLocalizacao GPS: -23.5505,-46.6333",
    );

    expect(result).toEqual({
      visibleText: "Buraco grande na calcada",
      hadGpsLine: true,
      coordsOnly: null,
    });
  });

  it("retorna coordenadas quando a mensagem contem apenas GPS", () => {
    const result = formatUserMessageHidingGpsLine("Localizacao GPS: -23.55, -46.63");

    expect(result.visibleText).toBe("");
    expect(result.hadGpsLine).toBe(true);
    expect(result.coordsOnly).toEqual({ lat: -23.55, lon: -46.63 });
  });

  it("mantem mensagens sem marcador GPS", () => {
    const result = formatUserMessageHidingGpsLine("Quero registrar uma sugestao");

    expect(result).toEqual({
      visibleText: "Quero registrar uma sugestao",
      hadGpsLine: false,
      coordsOnly: null,
    });
  });
});
