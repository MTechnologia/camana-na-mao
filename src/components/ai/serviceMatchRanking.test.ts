import { describe, expect, it } from "vitest";
import { rankServiceMatches } from "./serviceMatchRanking";

describe("rankServiceMatches", () => {
  it("coloca o match mais óbvio no topo (igual > começa com > contém), ignorando acento", () => {
    const rows = [
      { name: "CR P CONV PEQUENOS DO BUTANTA" }, // contém
      { name: "CEU EMEF BUTANTA" }, // contém
      { name: "Butantã" }, // igual (ignorando acento)
      { name: "Butantã - Professora Elizabeth" }, // começa com
    ];
    const ranked = rankServiceMatches(rows, "butanta");
    expect(ranked[0].name).toBe("Butantã");
    expect(ranked[1].name).toBe("Butantã - Professora Elizabeth");
  });

  it("mantém TODAS as linhas (apenas reordena, não filtra)", () => {
    const rows = [{ name: "A BUTANTA" }, { name: "B" }, { name: "C BUTANTA" }];
    const ranked = rankServiceMatches(rows, "butanta");
    expect(ranked.length).toBe(3);
  });

  it("sem query, preserva a ordem original", () => {
    const rows = [{ name: "Z" }, { name: "A" }];
    expect(rankServiceMatches(rows, "").map((r) => r.name)).toEqual(["Z", "A"]);
  });
});
