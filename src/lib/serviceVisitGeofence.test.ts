import { describe, expect, it } from "vitest";
import {
  SERVICE_VISIT_GEOFENCE_RADIUS_M,
  isOutsideServiceVisitGeofence,
  serviceVisitDistanceMeters,
} from "./serviceVisitGeofence";

describe("serviceVisitGeofence", () => {
  it("distância zero no mesmo ponto", () => {
    expect(serviceVisitDistanceMeters(-23.55, -46.63, -23.55, -46.63)).toBe(0);
  });

  it("simula entrada no raio e saída além do raio configurado (coordenadas aproximadas)", () => {
    const centerLat = -23.55;
    const centerLon = -46.63;
    const dInside = serviceVisitDistanceMeters(centerLat, centerLon, -23.5501, -46.6301);
    expect(dInside).toBeLessThanOrEqual(SERVICE_VISIT_GEOFENCE_RADIUS_M);

    const dOutside = serviceVisitDistanceMeters(centerLat, centerLon, -23.552, -46.632);
    expect(dOutside).toBeGreaterThan(SERVICE_VISIT_GEOFENCE_RADIUS_M);
    expect(isOutsideServiceVisitGeofence(dOutside)).toBe(true);
    expect(isOutsideServiceVisitGeofence(dInside)).toBe(false);
  });

  it("limiar: exatamente no raio não é saída; acima do raio é saída", () => {
    expect(isOutsideServiceVisitGeofence(SERVICE_VISIT_GEOFENCE_RADIUS_M)).toBe(false);
    expect(isOutsideServiceVisitGeofence(SERVICE_VISIT_GEOFENCE_RADIUS_M + 0.0001)).toBe(true);
  });
});
