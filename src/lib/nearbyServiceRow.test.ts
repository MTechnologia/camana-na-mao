import { describe, it, expect } from "vitest";
import {
  getBoundingBoxForRadiusMeters,
  mapPublicServiceRowToNearbyService,
} from "./nearbyServiceRow";

const REF_LAT = -23.55;
const REF_LNG = -46.63;
const base = { id: "a", latitude: -23.5, longitude: -46.6 };

describe("getBoundingBoxForRadiusMeters", () => {
  it("retorna bbox simétrica em torno do centro", () => {
    const b = getBoundingBoxForRadiusMeters(-23.55, -46.63, 1000);
    expect(b.maxLat).toBeGreaterThan(b.minLat);
    expect(b.maxLng).toBeGreaterThan(b.minLng);
    expect(b.maxLat - -23.55).toBeCloseTo(1000 / 111320, 6);
  });

  it("em latitude alta (polo) ainda retorna números finitos", () => {
    // cos(90°) ~ 6e-17 (não é exatamente 0), então lngDelta fica enorme porém
    // finito; o box continua válido (sem Infinity/NaN).
    const b = getBoundingBoxForRadiusMeters(90, 0, 1000);
    expect(Number.isFinite(b.minLat)).toBe(true);
    expect(Number.isFinite(b.maxLat)).toBe(true);
    expect(Number.isFinite(b.minLng)).toBe(true);
    expect(Number.isFinite(b.maxLng)).toBe(true);
    expect(b.maxLat - 90).toBeCloseTo(1000 / 111320, 6);
  });
});

describe("mapPublicServiceRowToNearbyService", () => {
  it("mapeia linha válida com todos os campos + distância", () => {
    const s = mapPublicServiceRowToNearbyService(
      {
        id: "x1",
        name: "UBS Centro",
        service_type: "ubs",
        address: "Rua 1",
        district: "Sé",
        latitude: -23.55,
        longitude: -46.63,
        phone: "11 3106-0000",
        average_rating: 4.5,
        total_ratings: 10,
        opening_hours: { text: "8h-18h" },
        services_offered: "clínica geral",
        operational_status: "open",
        equipment_nature: "publico",
      },
      REF_LAT,
      REF_LNG,
    );
    expect(s).not.toBeNull();
    expect(s).toMatchObject({
      id: "x1",
      name: "UBS Centro",
      service_type: "ubs",
      average_rating: 4.5,
      total_ratings: 10,
      operational_status: "open",
      equipment_nature: "publico",
    });
    expect(typeof s?.distance).toBe("number");
    expect(s?.distance).toBeGreaterThanOrEqual(0);
  });

  it("retorna null sem id", () => {
    expect(
      mapPublicServiceRowToNearbyService({ latitude: -23, longitude: -46 }, REF_LAT, REF_LNG),
    ).toBeNull();
  });

  it("retorna null com coordenada inválida (string não-numérica, ausente, infinita)", () => {
    expect(
      mapPublicServiceRowToNearbyService({ id: "a", latitude: "abc", longitude: -46 }, REF_LAT, REF_LNG),
    ).toBeNull();
    expect(mapPublicServiceRowToNearbyService({ id: "a", latitude: -23 }, REF_LAT, REF_LNG)).toBeNull();
    expect(
      mapPublicServiceRowToNearbyService(
        { id: "a", latitude: Infinity, longitude: -46 },
        REF_LAT,
        REF_LNG,
      ),
    ).toBeNull();
  });

  it("aceita lat/lng e ratings como strings numéricas", () => {
    const s = mapPublicServiceRowToNearbyService(
      { id: "a", latitude: "-23.5", longitude: "-46.6", average_rating: "4.2", total_ratings: "7" },
      REF_LAT,
      REF_LNG,
    );
    expect(s?.latitude).toBe(-23.5);
    expect(s?.average_rating).toBe(4.2);
    expect(s?.total_ratings).toBe(7);
  });

  it("aplica defaults p/ campos ausentes", () => {
    const s = mapPublicServiceRowToNearbyService(base, REF_LAT, REF_LNG);
    expect(s).toMatchObject({
      name: "",
      service_type: "other",
      address: "",
      district: "",
      phone: null,
      average_rating: 0,
      total_ratings: 0,
      opening_hours: null,
      services_offered: null,
      operational_status: null,
      equipment_nature: null,
    });
  });

  it("rating como string inválida → 0", () => {
    const s = mapPublicServiceRowToNearbyService(
      { ...base, average_rating: "abc" },
      REF_LAT,
      REF_LNG,
    );
    expect(s?.average_rating).toBe(0);
  });

  describe("equipment_nature / source_layer", () => {
    it("natureza explícita válida é mantida", () => {
      for (const n of ["publico", "privado", "misto_indefinido", "nao_aplicavel"] as const) {
        const s = mapPublicServiceRowToNearbyService({ ...base, equipment_nature: n }, REF_LAT, REF_LNG);
        expect(s?.equipment_nature).toBe(n);
      }
    });

    it("natureza inválida → infere por source_layer (público)", () => {
      const s = mapPublicServiceRowToNearbyService(
        { ...base, equipment_nature: "xxx", source_layer: "ceu" },
        REF_LAT,
        REF_LNG,
      );
      expect(s?.equipment_nature).toBe("publico");
    });

    it("source_layer rede_privada → privado", () => {
      const s = mapPublicServiceRowToNearbyService(
        { ...base, source_layer: "rede_privada" },
        REF_LAT,
        REF_LNG,
      );
      expect(s?.equipment_nature).toBe("privado");
    });

    it("source_layer de saúde mista → misto_indefinido", () => {
      const s = mapPublicServiceRowToNearbyService(
        { ...base, source_layer: "hospital" },
        REF_LAT,
        REF_LNG,
      );
      expect(s?.equipment_nature).toBe("misto_indefinido");
    });

    it("source_layer desconhecido → publico (default)", () => {
      const s = mapPublicServiceRowToNearbyService(
        { ...base, source_layer: "camada_qualquer" },
        REF_LAT,
        REF_LNG,
      );
      expect(s?.equipment_nature).toBe("publico");
    });

    it("source_layer vazio ou não-string → null", () => {
      expect(
        mapPublicServiceRowToNearbyService({ ...base, source_layer: "" }, REF_LAT, REF_LNG)
          ?.equipment_nature,
      ).toBeNull();
      expect(
        mapPublicServiceRowToNearbyService({ ...base, source_layer: 123 }, REF_LAT, REF_LNG)
          ?.equipment_nature,
      ).toBeNull();
    });

    it("override: natureza 'privado' + camada pública → publico", () => {
      const s = mapPublicServiceRowToNearbyService(
        { ...base, equipment_nature: "privado", source_layer: "ceu" },
        REF_LAT,
        REF_LNG,
      );
      expect(s?.equipment_nature).toBe("publico");
    });
  });
});
