import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

import { __test__ } from "./useRatingsConcentration";

const { aggregateRatings, startDateFromPeriod } = __test__;

const SP_LAT = -23.55;
const SP_LNG = -46.6;

interface RawRating {
  service_id: string;
  rating_stars: number;
  rating_dimensions: Record<string, number> | null;
  public_services: {
    name: string | null;
    district: string | null;
    service_type: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

function rating(over: Partial<RawRating>): RawRating {
  return {
    service_id: "svc-1",
    rating_stars: 5,
    rating_dimensions: null,
    public_services: {
      name: "UBS Centro",
      district: "Sé",
      service_type: "Saúde",
      latitude: SP_LAT,
      longitude: SP_LNG,
    },
    ...over,
  };
}

describe("startDateFromPeriod", () => {
  it("retorna ISO no passado para períodos finitos", () => {
    expect(startDateFromPeriod("30d")).not.toBeNull();
    expect(startDateFromPeriod("90d")).not.toBeNull();
    expect(startDateFromPeriod("12m")).not.toBeNull();
  });

  it("retorna null para 'all'", () => {
    expect(startDateFromPeriod("all")).toBeNull();
  });
});

describe("aggregateRatings", () => {
  it("retorna lista vazia para input vazio", () => {
    expect(aggregateRatings([])).toEqual([]);
  });

  it("agrupa avaliações pelo service_id", () => {
    const result = aggregateRatings([
      rating({ service_id: "a", rating_stars: 5 }),
      rating({ service_id: "a", rating_stars: 4 }),
      rating({ service_id: "b", rating_stars: 1 }),
    ]);
    expect(result).toHaveLength(2);
    const a = result.find((x) => x.serviceId === "a");
    expect(a?.count).toBe(2);
    expect(a?.avgStars).toBeCloseTo(4.5);
  });

  it("calcula distribuição de estrelas corretamente", () => {
    const result = aggregateRatings([
      rating({ service_id: "x", rating_stars: 1 }),
      rating({ service_id: "x", rating_stars: 1 }),
      rating({ service_id: "x", rating_stars: 5 }),
      rating({ service_id: "x", rating_stars: 5 }),
      rating({ service_id: "x", rating_stars: 3 }),
    ]);
    const a = result[0];
    expect(a.starsDistribution).toEqual([2, 0, 1, 0, 2]);
  });

  it("calcula índice de polarização (% de extremos 1-2 + 4-5)", () => {
    const result = aggregateRatings([
      rating({ service_id: "x", rating_stars: 1 }),
      rating({ service_id: "x", rating_stars: 5 }),
      rating({ service_id: "x", rating_stars: 3 }),
      rating({ service_id: "x", rating_stars: 3 }),
    ]);
    const a = result[0];
    // 2 extremos de 4 = 50%
    expect(a.polarizationIndex).toBe(50);
  });

  it("ignora avaliações sem coordenadas", () => {
    const result = aggregateRatings([
      rating({
        service_id: "no-coords",
        public_services: {
          name: "X",
          district: null,
          service_type: "Saúde",
          latitude: null,
          longitude: null,
        },
      }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("ignora avaliações fora dos bounds de SP", () => {
    const result = aggregateRatings([
      rating({
        service_id: "rio",
        public_services: {
          name: "Rio",
          district: null,
          service_type: "Saúde",
          latitude: -22.9,
          longitude: -43.2,
        },
      }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("filtra por service_type quando informado", () => {
    const result = aggregateRatings(
      [
        rating({
          service_id: "saude",
          public_services: {
            name: "UBS",
            district: null,
            service_type: "Saúde",
            latitude: SP_LAT,
            longitude: SP_LNG,
          },
        }),
        rating({
          service_id: "edu",
          public_services: {
            name: "Escola",
            district: null,
            service_type: "Educação",
            latitude: SP_LAT,
            longitude: SP_LNG,
          },
        }),
      ],
      "Saúde",
    );
    expect(result).toHaveLength(1);
    expect(result[0].serviceType).toBe("Saúde");
  });

  it("ordena por count descendente", () => {
    const result = aggregateRatings([
      rating({ service_id: "a", rating_stars: 5 }),
      rating({ service_id: "b", rating_stars: 5 }),
      rating({ service_id: "b", rating_stars: 5 }),
      rating({ service_id: "b", rating_stars: 5 }),
      rating({ service_id: "c", rating_stars: 3 }),
      rating({ service_id: "c", rating_stars: 3 }),
    ]);
    expect(result[0].serviceId).toBe("b");
    expect(result[0].count).toBe(3);
    expect(result[1].serviceId).toBe("c");
    expect(result[2].serviceId).toBe("a");
  });

  it("identifica top 3 dimensões com pior média (avg < 3.5)", () => {
    const result = aggregateRatings([
      rating({
        service_id: "x",
        rating_stars: 4,
        rating_dimensions: { atendimento: 2, limpeza: 5, tempo_espera: 1, infraestrutura: 4 },
      }),
      rating({
        service_id: "x",
        rating_stars: 3,
        rating_dimensions: { atendimento: 3, limpeza: 5, tempo_espera: 2, infraestrutura: 3 },
      }),
    ]);
    const a = result[0];
    // tempo_espera: (1+2)/2 = 1.5 → pior
    // atendimento: (2+3)/2 = 2.5
    // infraestrutura: (4+3)/2 = 3.5 → fica de fora (não < 3.5)
    expect(a.worstDimensions.length).toBeGreaterThanOrEqual(2);
    expect(a.worstDimensions[0].name).toBe("tempo_espera");
    expect(a.worstDimensions[0].avg).toBeCloseTo(1.5);
  });
});
