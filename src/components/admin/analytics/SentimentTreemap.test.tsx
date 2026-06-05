import { describe, expect, it } from "vitest";
import { fitLabel, treemapLabelMode } from "./sentimentTreemapLabels";

describe("treemapLabelMode", () => {
  it("usa rótulo horizontal em células largas", () => {
    expect(treemapLabelMode(200, 200)).toBe("horizontal");
    expect(treemapLabelMode(120, 32)).toBe("horizontal");
  });

  it("usa rótulo vertical em colunas finas e altas (zonas da esquerda no mobile)", () => {
    // Regressão: antes (width>64) essas células ficavam SEM texto.
    expect(treemapLabelMode(44, 120)).toBe("vertical");
    expect(treemapLabelMode(22, 57)).toBe("vertical");
  });

  it("não rotula células pequenas demais (resta só o tooltip nativo)", () => {
    expect(treemapLabelMode(20, 120)).toBe("none"); // estreita demais
    expect(treemapLabelMode(44, 40)).toBe("none"); // baixa demais p/ vertical e estreita p/ horizontal
  });
});

describe("fitLabel", () => {
  it("mantém o rótulo quando cabe", () => {
    expect(fitLabel("Zona Leste", 200)).toBe("Zona Leste");
  });

  it("trunca com reticências quando não cabe", () => {
    const out = fitLabel("Zona Leste", 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThan("Zona Leste".length);
  });

  it("retorna vazio quando não cabe nem um caractere", () => {
    expect(fitLabel("Zona Leste", 18)).toBe("");
  });
});
