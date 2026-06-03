import { describe, it, expect } from "vitest";
import { WIDGET_THEMES, WIDGET_THEMES_BY_ID, DEFAULT_THEME_ID, getTheme } from "./widgetThemes";

describe("WIDGET_THEMES catalog", () => {
  it("começa com 'geral' como primeiro tema (opção neutra)", () => {
    expect(WIDGET_THEMES[0]?.id).toBe("geral");
  });

  it("ids são únicos", () => {
    const ids = WIDGET_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tema 'geral' tem todas as 12 tabs em priorityTabs", () => {
    expect(WIDGET_THEMES_BY_ID.geral.priorityTabs.length).toBe(12);
  });

  it("temas não-geral têm priorityTabs (pelo menos 2)", () => {
    for (const t of WIDGET_THEMES) {
      if (t.id === "geral") continue;
      expect(t.priorityTabs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("Saúde mapeia UBS e hospital", () => {
    expect(WIDGET_THEMES_BY_ID.saude.publicServiceTypes).toContain("ubs");
    expect(WIDGET_THEMES_BY_ID.saude.publicServiceTypes).toContain("hospital");
  });

  it("Infraestrutura cobre as principais categorias urbanas", () => {
    const cats = WIDGET_THEMES_BY_ID.infraestrutura.urbanCategories;
    expect(cats).toContain("iluminacao");
    expect(cats).toContain("calcada");
    expect(cats).toContain("via_publica");
  });
});

describe("getTheme()", () => {
  it("retorna o tema correto por id", () => {
    expect(getTheme("saude").label).toBe("Saúde");
  });

  it("fallback para 'geral' quando id é null/undefined", () => {
    expect(getTheme(null).id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
  });

  it("fallback para 'geral' quando id é desconhecido", () => {
    expect(getTheme("inexistente").id).toBe(DEFAULT_THEME_ID);
  });
});
