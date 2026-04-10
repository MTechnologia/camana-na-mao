export type HeatmapPoint = { lat: number; lng: number; weight: number };

export type ReportsHeatmapPayload = {
  period: string;
  start_at: string;
  points: HeatmapPoint[];
  truncated: boolean;
};

/** Bbox aproximado do município de São Paulo (alinhado à RPC). */
export const SAO_PAULO_HEATMAP_BOUNDS = {
  minLat: -23.9,
  maxLat: -23.3,
  minLng: -46.85,
  maxLng: -46.36,
} as const;

export function isPointInSaoPauloBounds(lat: number, lng: number): boolean {
  return (
    lat >= SAO_PAULO_HEATMAP_BOUNDS.minLat &&
    lat <= SAO_PAULO_HEATMAP_BOUNDS.maxLat &&
    lng >= SAO_PAULO_HEATMAP_BOUNDS.minLng &&
    lng <= SAO_PAULO_HEATMAP_BOUNDS.maxLng
  );
}

export function parseHeatmapRpcPayload(raw: unknown): ReportsHeatmapPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pointsRaw = o.points;
  if (!Array.isArray(pointsRaw)) return null;

  const points: HeatmapPoint[] = [];
  for (const row of pointsRaw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const lat = typeof r.lat === "number" ? r.lat : Number(r.lat);
    const lng = typeof r.lng === "number" ? r.lng : Number(r.lng);
    const weight = typeof r.weight === "number" ? r.weight : Number(r.weight);
    if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(weight)) continue;
    if (!isPointInSaoPauloBounds(lat, lng)) continue;
    points.push({ lat, lng, weight: Math.max(0, weight) });
  }

  return {
    period: typeof o.period === "string" ? o.period : "",
    start_at: typeof o.start_at === "string" ? o.start_at : String(o.start_at ?? ""),
    points,
    truncated: o.truncated === true,
  };
}
