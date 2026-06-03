import { describe, expect, it } from "vitest";
import { extractKeywords } from "./keywordExtraction";

describe("extractKeywords", () => {
  it("descarta stopwords e tokens curtos, mantendo termos relevantes", () => {
    const reports = [
      { description: "Buraco na calçada muito perto da escola", sentiment: "negative" },
      { description: "Outro buraco na calçada para os pedestres", sentiment: "negative" },
    ];
    const result = extractKeywords(reports);
    const texts = result.map((w) => w.text);

    expect(texts).toContain("buraco");
    expect(texts).toContain("calçada");
    // stopwords (>=4 chars) e tokens curtos não entram
    expect(texts).not.toContain("muito");
    expect(texts).not.toContain("para");
    expect(texts).not.toContain("na");
  });

  it("ignora termos que aparecem em apenas um relato (ruído)", () => {
    const reports = [
      { description: "lixo acumulado esquina", sentiment: "negative" },
      { description: "lixo espalhado novamente", sentiment: "negative" },
    ];
    const texts = extractKeywords(reports).map((w) => w.text);
    expect(texts).toContain("lixo"); // 2 relatos
    expect(texts).not.toContain("esquina"); // 1 relato só
  });

  it("atribui o sentimento predominante a cada termo", () => {
    const reports = [
      { description: "atraso atraso", sentiment: "negative" },
      { description: "atraso constante", sentiment: "negative" },
      { description: "atraso resolvido", sentiment: "positive" },
    ];
    const atraso = extractKeywords(reports).find((w) => w.text === "atraso");
    expect(atraso?.sentiment).toBe("negative");
  });

  it("conta cada termo no máximo uma vez por relato", () => {
    const reports = [
      { description: "ruído ruído ruído ruído", sentiment: "neutral" },
      { description: "ruído à noite", sentiment: "neutral" },
    ];
    const ruido = extractKeywords(reports).find((w) => w.text === "ruído");
    expect(ruido?.count).toBe(2);
  });

  it("respeita o limite de termos", () => {
    const reports = Array.from({ length: 60 }, (_, i) => ({
      description: `termo${i} termo${i} comum comum`,
      sentiment: "neutral",
    }));
    expect(extractKeywords(reports, 10).length).toBeLessThanOrEqual(10);
  });
});
