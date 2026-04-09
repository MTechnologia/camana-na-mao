import {
  SERVICE_RATING_DIMENSION_KEYS,
  type ServiceRatingDimensionKey,
} from "@/lib/serviceRatingDimensions";

export type WorstServiceByDimensionRow = {
  service_id: string;
  name: string;
  service_type: string;
  district: string;
  avg_dimension: number;
  rating_count: number;
};

export type WorstServicesByDimensionPayload = {
  dimension: ServiceRatingDimensionKey;
  period: string;
  limit: number;
  start_at: string;
  items: WorstServiceByDimensionRow[];
};

export function isValidDimensionKey(d: string): d is ServiceRatingDimensionKey {
  return (SERVICE_RATING_DIMENSION_KEYS as readonly string[]).includes(d);
}

export function parseWorstServicesByDimensionPayload(raw: unknown): WorstServicesByDimensionPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const dim = typeof o.dimension === "string" ? o.dimension : "";
  if (!isValidDimensionKey(dim)) return null;

  const itemsRaw = o.items;
  if (!Array.isArray(itemsRaw)) return null;

  const items: WorstServiceByDimensionRow[] = [];
  for (const row of itemsRaw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const service_id = typeof r.service_id === "string" ? r.service_id : String(r.service_id ?? "");
    const name = typeof r.name === "string" ? r.name : "";
    const service_type = typeof r.service_type === "string" ? r.service_type : String(r.service_type ?? "");
    const district = typeof r.district === "string" ? r.district : String(r.district ?? "");
    const avg_dimension = typeof r.avg_dimension === "number" ? r.avg_dimension : Number(r.avg_dimension);
    const rating_count = typeof r.rating_count === "number" ? r.rating_count : Number(r.rating_count);
    if (!service_id || Number.isNaN(avg_dimension) || Number.isNaN(rating_count)) continue;
    items.push({
      service_id,
      name,
      service_type,
      district,
      avg_dimension,
      rating_count: Math.max(0, Math.floor(rating_count)),
    });
  }

  return {
    dimension: dim,
    period: typeof o.period === "string" ? o.period : "",
    limit: typeof o.limit === "number" ? o.limit : Number(o.limit) || 20,
    start_at: typeof o.start_at === "string" ? o.start_at : String(o.start_at ?? ""),
    items,
  };
}
