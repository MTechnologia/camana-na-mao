import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bairroParaZona,
  ZONA_DESCONHECIDA,
  type ZonaVolumeOuDesconhecida,
} from "@/lib/regionMapping";

export type HeatmapCell = { x: string; y: string; value: number };

/** Dias da semana na ordem natural (getDay: 0=Dom). */
export const HEATMAP_WEEKDAY_ORDER = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Rótulos curtos das zonas canônicas de SP (mesmo classificador do analytics). */
const ZONE_SHORT: Record<ZonaVolumeOuDesconhecida, string> = {
  Centro: "Centro",
  "Zona Norte": "Norte",
  "Zona Sul": "Sul",
  "Zona Leste": "Leste",
  "Zona Oeste": "Oeste",
  [ZONA_DESCONHECIDA]: "Outros",
};

/** Ordem de exibição das colunas (zonas). "Outros" só entra se houver relato sem zona. */
export const HEATMAP_ZONE_BASE_ORDER = ["Centro", "Norte", "Sul", "Leste", "Oeste"] as const;

type Range = { from?: Date; to?: Date };

/**
 * Heatmap "zona da cidade × dia da semana" calculado no cliente a partir de
 * urban_reports (RLS de leitura pública), usando o classificador canônico
 * bairroParaZona — assim separamos Norte/Sul/Leste/Oeste/Centro (+ Outros)
 * em vez do bucket "Demais" da RPC. Funciona para qualquer cidadão logado.
 *
 * Protótipo: amostra os relatos mais recentes do período (limit) — para volumes
 * grandes, o ideal é uma RPC agregada (fluxo do time).
 */
export function useCityZoneHeatmap(range?: Range, limit = 5000) {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [zoneOrder, setZoneOrder] = useState<string[]>([...HEATMAP_ZONE_BASE_ORDER]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pStart = range?.from?.toISOString() ?? null;
  const pEnd = range?.to?.toISOString() ?? null;

  const fetchHeatmap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("urban_reports")
        .select("neighborhood, location_address, latitude, longitude, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (pStart) query = query.gte("created_at", pStart);
      if (pEnd) query = query.lte("created_at", pEnd);

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      const counts = new Map<string, number>();
      let hasOutros = false;

      for (const row of data ?? []) {
        if (!row.created_at) continue;
        const zona = bairroParaZona(
          row.neighborhood ?? row.location_address,
          row.latitude,
          row.longitude,
        );
        if (zona === ZONA_DESCONHECIDA) hasOutros = true;
        const zoneLabel = ZONE_SHORT[zona];
        const weekday = HEATMAP_WEEKDAY_ORDER[new Date(row.created_at).getDay()];
        const key = `${zoneLabel}||${weekday}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      const zones = hasOutros
        ? [...HEATMAP_ZONE_BASE_ORDER, "Outros"]
        : [...HEATMAP_ZONE_BASE_ORDER];

      const grid: HeatmapCell[] = [];
      for (const zone of zones) {
        for (const weekday of HEATMAP_WEEKDAY_ORDER) {
          grid.push({ x: zone, y: weekday, value: counts.get(`${zone}||${weekday}`) ?? 0 });
        }
      }

      setZoneOrder(zones);
      setCells(grid);
    } catch (e) {
      console.error("[useCityZoneHeatmap]", e);
      setCells([]);
      setZoneOrder([...HEATMAP_ZONE_BASE_ORDER]);
      setError(e instanceof Error ? e.message : "Erro ao carregar mapa de calor");
    } finally {
      setLoading(false);
    }
  }, [pStart, pEnd, limit]);

  useEffect(() => {
    void fetchHeatmap();
  }, [fetchHeatmap]);

  return { cells, zoneOrder, loading, error, refetch: fetchHeatmap };
}
