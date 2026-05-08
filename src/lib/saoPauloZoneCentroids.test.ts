import { describe, it, expect } from "vitest";
import { centroidForZone, SP_ZONE_CENTROIDS } from "./saoPauloZoneCentroids";

describe("saoPauloZoneCentroids", () => {
  it("retorna lat/lng para as 5 zonas conhecidas", () => {
    expect(centroidForZone("Centro")).toEqual(SP_ZONE_CENTROIDS.Centro);
    expect(centroidForZone("Zona Norte")).toEqual(SP_ZONE_CENTROIDS["Zona Norte"]);
    expect(centroidForZone("Zona Sul")).toEqual(SP_ZONE_CENTROIDS["Zona Sul"]);
    expect(centroidForZone("Zona Leste")).toEqual(SP_ZONE_CENTROIDS["Zona Leste"]);
    expect(centroidForZone("Zona Oeste")).toEqual(SP_ZONE_CENTROIDS["Zona Oeste"]);
  });

  it("retorna null para zona desconhecida", () => {
    expect(centroidForZone("Não informada")).toBeNull();
    expect(centroidForZone("Zona X")).toBeNull();
  });

  it("retorna null para entrada nula/vazia", () => {
    expect(centroidForZone(null)).toBeNull();
    expect(centroidForZone(undefined)).toBeNull();
    expect(centroidForZone("")).toBeNull();
  });

  it("todos os centroides estão dentro do bbox aproximado de SP", () => {
    Object.values(SP_ZONE_CENTROIDS).forEach((c) => {
      expect(c.lat).toBeGreaterThan(-23.9);
      expect(c.lat).toBeLessThan(-23.3);
      expect(c.lng).toBeGreaterThan(-46.85);
      expect(c.lng).toBeLessThan(-46.36);
    });
  });
});
