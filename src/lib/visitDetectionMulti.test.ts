import { describe, expect, it } from "vitest";
import { pickClosestByDistanceMeters } from "./visitDetectionMulti";

describe("pickClosestByDistanceMeters", () => {
  it("retorna null para lista vazia", () => {
    expect(pickClosestByDistanceMeters([])).toBeNull();
  });

  it("cenário OS-06: três equipamentos dentro de 50m — notificação só para o mais próximo (menor distância)", () => {
    const items = [
      { id: "ubs", distanceMeters: 35 },
      { id: "escola", distanceMeters: 12 },
      { id: "creche", distanceMeters: 48 },
    ];
    expect(pickClosestByDistanceMeters(items)).toEqual({ id: "escola", distanceMeters: 12 });
  });

  it("empate na mesma distância mantém o primeiro encontrado no reduce", () => {
    const items = [
      { id: "first", distanceMeters: 10 },
      { id: "second", distanceMeters: 10 },
    ];
    expect(pickClosestByDistanceMeters(items)?.id).toBe("first");
  });
});
