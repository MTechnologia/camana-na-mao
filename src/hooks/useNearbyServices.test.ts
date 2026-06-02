import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { useNearbyServices } from "./useNearbyServices";
import {
  saveNearbyServicesCache,
  type CachedNearbyService,
} from "@/lib/nearbyServicesCache";

/**
 * A3.8 — Fluxo offline do useNearbyServices: sem rede, deve servir o último
 * resultado do cache IndexedDB (sem perda de dados críticos) e sinalizar o modo
 * offline. Quando não há cache, lista vazia + aviso.
 */

const LAT = -23.55;
const LNG = -46.63;

function cachedSvc(id: number): CachedNearbyService {
  return {
    id: `s${id}`,
    name: `UBS ${id}`,
    service_type: "ubs",
    address: `Rua ${id}`,
    district: "Sé",
    latitude: LAT + id / 10000,
    longitude: LNG + id / 10000,
    phone: null,
    average_rating: 4,
    total_ratings: 10,
    opening_hours: null,
    services_offered: null,
    operational_status: "open",
    equipment_nature: "publico",
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  setOnline(true);
});

afterEach(() => {
  setOnline(true);
  vi.restoreAllMocks();
});

describe("useNearbyServices — offline (cache IndexedDB)", () => {
  it("offline COM cache → exibe os equipamentos cacheados + aviso de modo offline", async () => {
    await saveNearbyServicesCache([cachedSvc(1), cachedSvc(2)], LAT, LNG, 5000);
    setOnline(false);

    const { result } = renderHook(() =>
      useNearbyServices({ latitude: LAT, longitude: LNG, radiusMeters: 5000 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Dados críticos preservados: a lista cacheada continua disponível offline.
    expect(result.current.services.length).toBeGreaterThanOrEqual(1);
    expect(result.current.services.map((s) => s.id)).toEqual(
      expect.arrayContaining(["s1", "s2"]),
    );
    // Distância recalculada a partir do centro cacheado.
    expect(typeof result.current.services[0].distance).toBe("number");
    expect(result.current.error).toMatch(/sem conex/i);
  });

  it("offline SEM cache → lista vazia + aviso de sem conexão/sem cache", async () => {
    setOnline(false);

    const { result } = renderHook(() =>
      useNearbyServices({ latitude: LAT, longitude: LNG, radiusMeters: 5000 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.services).toEqual([]);
    expect(result.current.error).toMatch(/sem conex|cache/i);
  });
});
