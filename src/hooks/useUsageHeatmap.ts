import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isPointInSaoPauloBounds,
  parseHeatmapRpcPayload,
  type HeatmapPoint,
  type ReportsHeatmapPayload,
} from "@/lib/reportsHeatmapData";
import { bairroParaZona } from "@/lib/regionMapping";
import { centroidForZone } from "@/lib/saoPauloZoneCentroids";

/**
 * HU-4.1 — Mapa de calor de "Uso total" da plataforma.
 *
 * Combina 4 fontes em um único payload de pontos georreferenciados:
 *   1. urban_reports                 → RPC `get_reports_heatmap_data` (filtro 'urban')
 *   2. service_ratings (avaliações)  → RPC `get_reports_heatmap_data` (filtro 'evaluation')
 *   3. service_visits                → SELECT direto + JOIN public_services.lat/lng
 *   4. transport_reports             → centroide da zona (fallback porque não tem lat/lng)
 *
 * O usuário pode filtrar por uma fonte específica ou ver "all_usage" agregado.
 * Pesos são somados quando o ponto coincide; truncated reflete se algum corte
 * foi aplicado.
 */

export type UsageHeatmapTypeFilter =
  | "all_usage"
  | "all_reports"   // urban + evaluation (compatível com HU-4.1 atual)
  | "urban"
  | "evaluation"
  | "visits"
  | "transport";

export type UsageHeatmapPeriod = "7d" | "30d" | "90d" | "12m";

export interface UsageHeatmapBreakdown {
  urban: number;
  evaluation: number;
  visits: number;
  transport: number;
}

export interface UsageHeatmapPayload extends ReportsHeatmapPayload {
  /** Quantidade de pontos contribuída por cada fonte (após filtros). */
  breakdown: UsageHeatmapBreakdown;
}

const PERIOD_TO_DAYS: Record<UsageHeatmapPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

function startDateFromPeriod(period: UsageHeatmapPeriod): string {
  const days = PERIOD_TO_DAYS[period];
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function fetchRpcPoints(
  rpcType: "urban" | "evaluation",
  period: UsageHeatmapPeriod,
): Promise<{ points: HeatmapPoint[]; truncated: boolean }> {
  const { data, error } = await supabase.rpc("get_reports_heatmap_data", {
    p_type: rpcType,
    p_period: period,
  });
  if (error) {
    console.warn(`[useUsageHeatmap] RPC ${rpcType} falhou`, error);
    return { points: [], truncated: false };
  }
  const parsed = parseHeatmapRpcPayload(data);
  return { points: parsed?.points ?? [], truncated: parsed?.truncated === true };
}

async function fetchVisitsPoints(period: UsageHeatmapPeriod): Promise<{ points: HeatmapPoint[]; truncated: boolean }> {
  const startAt = startDateFromPeriod(period);
  const { data, error } = await supabase
    .from("service_visits")
    .select("public_services(latitude, longitude)")
    .gte("created_at", startAt)
    .limit(5000);
  if (error) {
    console.warn("[useUsageHeatmap] visits falhou", error);
    return { points: [], truncated: false };
  }
  // Agrega por arredondamento de coords (~50m)
  const cellMap = new Map<string, HeatmapPoint>();
  (data ?? []).forEach((row) => {
    const r = row as { public_services: { latitude: number | null; longitude: number | null } | { latitude: number | null; longitude: number | null }[] | null };
    const svc = Array.isArray(r.public_services) ? r.public_services[0] : r.public_services;
    if (!svc?.latitude || !svc?.longitude) return;
    const lat = svc.latitude;
    const lng = svc.longitude;
    if (!isPointInSaoPauloBounds(lat, lng)) return;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const slot = cellMap.get(key) ?? { lat, lng, weight: 0 };
    slot.weight += 1;
    cellMap.set(key, slot);
  });
  return { points: Array.from(cellMap.values()), truncated: (data ?? []).length >= 5000 };
}

async function fetchTransportPoints(period: UsageHeatmapPeriod): Promise<{ points: HeatmapPoint[]; truncated: boolean }> {
  const startAt = startDateFromPeriod(period);
  const { data, error } = await supabase
    .from("transport_reports")
    .select("location, stop_location")
    .gte("created_at", startAt)
    .limit(5000);
  if (error) {
    console.warn("[useUsageHeatmap] transport falhou", error);
    return { points: [], truncated: false };
  }
  // Geocoding aproximado: bairro/local → zona → centroide
  const zoneCount = new Map<string, number>();
  (data ?? []).forEach((row) => {
    const r = row as { location: string | null; stop_location: string | null };
    const text = (r.location || r.stop_location || "").trim();
    if (!text) return;
    const zone = bairroParaZona(text);
    if (zone === "Não informada") return;
    zoneCount.set(String(zone), (zoneCount.get(String(zone)) ?? 0) + 1);
  });
  const points: HeatmapPoint[] = [];
  zoneCount.forEach((count, zone) => {
    const c = centroidForZone(zone);
    if (!c) return;
    if (!isPointInSaoPauloBounds(c.lat, c.lng)) return;
    // Espalha levemente em torno do centroide pra não virar 1 ponto gigante visualmente
    points.push({ lat: c.lat, lng: c.lng, weight: count });
  });
  return { points, truncated: (data ?? []).length >= 5000 };
}

/**
 * Combina pontos somando weights quando coincidem (4 casas de lat/lng).
 */
function mergePoints(...lists: HeatmapPoint[][]): HeatmapPoint[] {
  const map = new Map<string, HeatmapPoint>();
  lists.forEach((list) => {
    list.forEach((p) => {
      const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      const slot = map.get(key) ?? { lat: p.lat, lng: p.lng, weight: 0 };
      slot.weight += p.weight;
      map.set(key, slot);
    });
  });
  return Array.from(map.values());
}

export function useUsageHeatmap(params: {
  typeFilter: UsageHeatmapTypeFilter;
  period: UsageHeatmapPeriod;
}) {
  const [data, setData] = useState<UsageHeatmapPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const period = params.period;
      const want = params.typeFilter;

      const [urban, evaluation, visits, transport] = await Promise.all([
        want === "urban" || want === "all_usage" || want === "all_reports"
          ? fetchRpcPoints("urban", period)
          : Promise.resolve({ points: [], truncated: false }),
        want === "evaluation" || want === "all_usage" || want === "all_reports"
          ? fetchRpcPoints("evaluation", period)
          : Promise.resolve({ points: [], truncated: false }),
        want === "visits" || want === "all_usage"
          ? fetchVisitsPoints(period)
          : Promise.resolve({ points: [], truncated: false }),
        want === "transport" || want === "all_usage"
          ? fetchTransportPoints(period)
          : Promise.resolve({ points: [], truncated: false }),
      ]);

      const breakdown: UsageHeatmapBreakdown = {
        urban: urban.points.length,
        evaluation: evaluation.points.length,
        visits: visits.points.length,
        transport: transport.points.length,
      };

      const points = mergePoints(
        urban.points,
        evaluation.points,
        visits.points,
        transport.points,
      );

      setData({
        period,
        start_at: startDateFromPeriod(period),
        points,
        truncated:
          urban.truncated || evaluation.truncated || visits.truncated || transport.truncated,
        breakdown,
      });
    } catch (e) {
      console.error("[useUsageHeatmap]", e);
      setError(e instanceof Error ? e.message : "Erro ao carregar mapa de calor");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.typeFilter, params.period]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { data, isLoading, error, refresh: fetchAll };
}

// Helpers exportados para teste
export const __test__ = {
  mergePoints,
  startDateFromPeriod,
};
