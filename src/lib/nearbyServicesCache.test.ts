import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getNearbyServicesCache,
  saveNearbyServicesCache,
  type CachedNearbyService,
} from "./nearbyServicesCache";

/**
 * A3.8 — Cache offline (IndexedDB) de equipamentos próximos.
 * Usa fake-indexeddb (polyfill) para validar persistência e leitura no vitest.
 */

function svc(id: number): CachedNearbyService {
  return {
    id: `s${id}`,
    name: `Serviço ${id}`,
    service_type: "ubs",
    address: `Rua ${id}`,
    district: "Sé",
    latitude: -23.55 + id / 10000,
    longitude: -46.63 + id / 10000,
    phone: null,
    average_rating: 4,
    total_ratings: 10,
    opening_hours: null,
    services_offered: null,
    operational_status: "open",
    equipment_nature: "publico",
  };
}

beforeEach(() => {
  // DB limpo a cada teste (isolamento).
  globalThis.indexedDB = new IDBFactory();
});

describe("nearbyServicesCache (IndexedDB offline)", () => {
  it("persiste e lê de volta a última visualização (round-trip)", async () => {
    const services = [svc(1), svc(2), svc(3)];
    await saveNearbyServicesCache(services, -23.55, -46.63, 5000);

    const entry = await getNearbyServicesCache();
    expect(entry).not.toBeNull();
    expect(entry?.services).toHaveLength(3);
    expect(entry?.services.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(entry?.centerLat).toBe(-23.55);
    expect(entry?.centerLng).toBe(-46.63);
    expect(entry?.radiusMeters).toBe(5000);
    expect(typeof entry?.savedAt).toBe("number");
  });

  it("não grava nada quando a lista está vazia (get retorna null)", async () => {
    await saveNearbyServicesCache([], -23.55, -46.63, 5000);
    expect(await getNearbyServicesCache()).toBeNull();
  });

  it("retorna null quando não há cache", async () => {
    expect(await getNearbyServicesCache()).toBeNull();
  });

  it("limita a 3000 equipamentos (não estoura armazenamento)", async () => {
    const many = Array.from({ length: 3500 }, (_, i) => svc(i));
    await saveNearbyServicesCache(many, -23.55, -46.63, 5000);

    const entry = await getNearbyServicesCache();
    expect(entry?.services).toHaveLength(3000);
  });

  it("sobrescreve a entrada anterior (invalidação por novo fetch)", async () => {
    await saveNearbyServicesCache([svc(1), svc(2)], -23.55, -46.63, 2000);
    await saveNearbyServicesCache([svc(9)], -23.6, -46.7, 1000);

    const entry = await getNearbyServicesCache();
    expect(entry?.services.map((s) => s.id)).toEqual(["s9"]);
    expect(entry?.centerLat).toBe(-23.6);
    expect(entry?.radiusMeters).toBe(1000);
  });

  it("um get IMEDIATAMENTE após o save vê os dados (commit aguardado)", async () => {
    // Regressão: antes o save fechava o DB sem aguardar tx.oncomplete; um get
    // logo em seguida podia rodar antes do commit e retornar vazio.
    await saveNearbyServicesCache([svc(42)], -23.55, -46.63, 3000);
    const entry = await getNearbyServicesCache();
    expect(entry?.services[0]?.id).toBe("s42");
  });
});
