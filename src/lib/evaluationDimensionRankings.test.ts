import { describe, expect, it } from "vitest";
import {
  isValidDimensionKey,
  parseWorstServicesByDimensionPayload,
} from "./evaluationDimensionRankings";

describe("isValidDimensionKey", () => {
  it("aceita as quatro dimensões conhecidas", () => {
    expect(isValidDimensionKey("atendimento")).toBe(true);
    expect(isValidDimensionKey("limpeza")).toBe(true);
    expect(isValidDimensionKey("infraestrutura")).toBe(true);
    expect(isValidDimensionKey("tempo_espera")).toBe(true);
  });

  it("rejeita chaves inválidas", () => {
    expect(isValidDimensionKey("geral")).toBe(false);
    expect(isValidDimensionKey("")).toBe(false);
  });
});

describe("parseWorstServicesByDimensionPayload", () => {
  it("parseia itens de múltiplas dimensões e preserva ordenação lógica dos campos", () => {
    const atendimento = {
      dimension: "atendimento",
      period: "30d",
      limit: 20,
      start_at: "2026-01-01T00:00:00.000Z",
      items: [
        {
          service_id: "a-1",
          name: "UBS X",
          service_type: "ubs",
          district: "Centro",
          avg_dimension: 1.25,
          rating_count: 8,
        },
      ],
    };
    const limpeza = {
      dimension: "limpeza",
      period: "7d",
      limit: 10,
      start_at: "2026-02-01T00:00:00.000Z",
      items: [
        {
          service_id: "b-2",
          name: "CEU Y",
          service_type: "ceu",
          district: "Sul",
          avg_dimension: 2.0,
          rating_count: 3,
        },
        {
          service_id: "c-3",
          name: "Parque Z",
          service_type: "park",
          district: "Norte",
          avg_dimension: 2.5,
          rating_count: 10,
        },
      ],
    };

    const pa = parseWorstServicesByDimensionPayload(atendimento);
    const pl = parseWorstServicesByDimensionPayload(limpeza);

    expect(pa?.dimension).toBe("atendimento");
    expect(pa?.items).toHaveLength(1);
    expect(pa?.items[0].avg_dimension).toBe(1.25);

    expect(pl?.dimension).toBe("limpeza");
    expect(pl?.items).toHaveLength(2);
    expect(pl?.items[1].name).toBe("Parque Z");
  });

  it("ignora linhas inválidas e retorna null sem dimension válida", () => {
    expect(
      parseWorstServicesByDimensionPayload({
        dimension: "invalid",
        items: [],
      })
    ).toBeNull();

    const partial = parseWorstServicesByDimensionPayload({
      dimension: "infraestrutura",
      period: "90d",
      limit: 5,
      start_at: "",
      items: [
        { service_id: "", name: "x", service_type: "ubs", district: "d", avg_dimension: 3, rating_count: 1 },
        { service_id: "ok", name: "y", service_type: "ubs", district: "d", avg_dimension: 2, rating_count: 2 },
      ],
    });
    expect(partial?.items).toHaveLength(1);
    expect(partial?.items[0].service_id).toBe("ok");
  });

  it("retorna null sem items array", () => {
    expect(parseWorstServicesByDimensionPayload({ dimension: "tempo_espera" })).toBeNull();
  });
});
