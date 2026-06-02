import { describe, it, expect } from "vitest";
import {
  TRIAGE_PRIORITIES,
  TRIAGE_PRIORITY_ORDER,
  TRIAGE_STATUSES,
  TRIAGE_STATUS_ORDER,
  daysSince,
  isStale,
} from "./triage";

/**
 * HU-10 — Testes do catálogo de triagem.
 */

describe("TRIAGE_PRIORITIES", () => {
  it("cobre 4 níveis P0-P3 com rank decrescente", () => {
    expect(TRIAGE_PRIORITY_ORDER).toEqual(["P0", "P1", "P2", "P3"]);
    expect(TRIAGE_PRIORITIES.P0.rank).toBe(4);
    expect(TRIAGE_PRIORITIES.P1.rank).toBe(3);
    expect(TRIAGE_PRIORITIES.P2.rank).toBe(2);
    expect(TRIAGE_PRIORITIES.P3.rank).toBe(1);
  });

  it("cada prioridade tem label, descrição e classes de cor", () => {
    for (const code of TRIAGE_PRIORITY_ORDER) {
      const meta = TRIAGE_PRIORITIES[code];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(10);
      expect(meta.bgClass).toMatch(/bg-/);
    }
  });

  it("P0 é crítica e bate com badge destrutivo", () => {
    expect(TRIAGE_PRIORITIES.P0.shortLabel).toBe("Crítica");
    expect(TRIAGE_PRIORITIES.P0.bgClass).toContain("destructive");
  });
});

describe("TRIAGE_STATUSES", () => {
  it("define funil de 5 etapas em ordem", () => {
    expect(TRIAGE_STATUS_ORDER).toEqual([
      "untriaged",
      "triaged",
      "in_progress",
      "resolved",
      "closed",
    ]);
  });

  it("apenas 'closed' não tem próximo status", () => {
    for (const s of TRIAGE_STATUS_ORDER) {
      const next = TRIAGE_STATUSES[s].next;
      if (s === "closed") {
        expect(next).toBeUndefined();
      } else {
        expect(next).toBeDefined();
      }
    }
  });

  it("a sequência de 'next' percorre o funil até closed", () => {
    let curr: keyof typeof TRIAGE_STATUSES | undefined = "untriaged";
    const visited: string[] = [];
    while (curr) {
      visited.push(curr);
      curr = TRIAGE_STATUSES[curr].next;
    }
    expect(visited).toEqual(["untriaged", "triaged", "in_progress", "resolved", "closed"]);
  });
});

describe("daysSince", () => {
  it("retorna 0 para null", () => {
    expect(daysSince(null)).toBe(0);
  });

  it("retorna 0 para data atual", () => {
    expect(daysSince(new Date().toISOString())).toBe(0);
  });

  it("retorna N dias inteiros", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(daysSince(fiveDaysAgo.toISOString())).toBe(5);
  });
});

describe("isStale", () => {
  it("é false quando há atualização recente", () => {
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    expect(isStale(recent.toISOString(), 7)).toBe(false);
  });

  it("é true quando passou o limite", () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isStale(old.toISOString(), 7)).toBe(true);
  });

  it("respeita o limite configurável", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(fiveDaysAgo, 3)).toBe(true);
    expect(isStale(fiveDaysAgo, 7)).toBe(false);
  });
});
