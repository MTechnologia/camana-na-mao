import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { ANALYTICS_REALTIME_FULL } from "@/lib/analyticsRealtimeTables";
import type { ReportsAnalyticsFilters } from "@/hooks/useReportsAnalytics";
import { DIMENSIONS, type DimensionKey, type UnifiedReport } from "@/lib/analyticsDimensions";
import {
  applyCrossAnalyticsDateFilters,
  filterUnifiedReportsByRegion,
  resolveCrossCategorySlice,
  shouldFetchEvaluationsForCategory,
  shouldFetchTransportForCategory,
  shouldFetchUrbanForCategory,
} from "@/lib/crossAnalyticsFilters";

/**
 * HU-3.5 — Drill-across N×N entre dimensões analíticas.
 *
 * Carrega urbano + transporte + avaliações no recorte global (período, região,
 * categoria). A troca de dimensões re-agrega em memória; mudança de filtro
 * recarrega a base.
 */

export interface CrossCellMatrix {
  rowDim: DimensionKey;
  colDim: DimensionKey;
  /** Valores únicos da linha (ordenados por count desc). */
  rowValues: Array<{ value: string; label: string; total: number }>;
  /** Valores únicos da coluna (ordenados por count desc). */
  colValues: Array<{ value: string; label: string; total: number }>;
  /** key: `${row}|${col}` → count */
  cells: Record<string, number>;
  total: number;
  maxCount: number;
}

const EMPTY_MATRIX: CrossCellMatrix = {
  rowDim: "category",
  colDim: "gender",
  rowValues: [],
  colValues: [],
  cells: {},
  total: 0,
  maxCount: 0,
};

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

interface DemoMap {
  gender: string | null;
  race: string | null;
  social_class: string | null;
  age: number | null;
}

async function fetchUrban(
  filters: ReportsAnalyticsFilters,
): Promise<Array<Partial<UnifiedReport>>> {
  const slice = resolveCrossCategorySlice(filters.category);
  if (!shouldFetchUrbanForCategory(slice)) return [];

  const out: Array<Partial<UnifiedReport>> = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = supabase
      .from("urban_reports")
      .select(
        "id, status, severity, neighborhood, latitude, longitude, created_at, ai_classification, user_id",
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    query = applyCrossAnalyticsDateFilters(query, filters);
    if (!slice.isAll) {
      query = query.in("category", slice.urbanCategories);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      status: string | null;
      severity: string | null;
      neighborhood: string | null;
      latitude: number | null;
      longitude: number | null;
      created_at: string | null;
      ai_classification: { sentiment?: string; source?: string } | null;
      user_id: string | null;
    }>;
    rows.forEach((r) => {
      const cls = r.ai_classification ?? {};
      out.push({
        id: r.id,
        category: "Urbano",
        status: r.status,
        severity: r.severity,
        neighborhood: r.neighborhood,
        latitude: r.latitude,
        longitude: r.longitude,
        createdAt: r.created_at,
        sentimentRaw: cls.sentiment ?? null,
        source: (cls.source as UnifiedReport["source"]) ?? "manual",
        userId: r.user_id,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchTransport(
  filters: ReportsAnalyticsFilters,
): Promise<Array<Partial<UnifiedReport>>> {
  const slice = resolveCrossCategorySlice(filters.category);
  if (!shouldFetchTransportForCategory(slice)) return [];

  const out: Array<Partial<UnifiedReport>> = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = supabase
      .from("transport_reports")
      .select("id, status, severity, location, stop_location, ai_sentiment, created_at, user_id")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    query = applyCrossAnalyticsDateFilters(query, filters);
    if (!slice.isAll) {
      const orParts = slice.transportSubcategories.flatMap((sc) => [
        `report_type.eq.${sc}`,
        `sub_category.eq.${sc}`,
      ]);
      query = query.or(orParts.join(","));
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      status: string | null;
      severity: string | null;
      location: string | null;
      stop_location: string | null;
      ai_sentiment: string | null;
      created_at: string | null;
      user_id: string | null;
    }>;
    rows.forEach((r) => {
      out.push({
        id: r.id,
        category: "Transporte",
        status: r.status,
        severity: r.severity,
        neighborhood: r.location || r.stop_location,
        latitude: null,
        longitude: null,
        createdAt: r.created_at,
        sentimentRaw: r.ai_sentiment,
        source: r.ai_sentiment ? "ai" : "manual",
        userId: r.user_id,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchService(
  filters: ReportsAnalyticsFilters,
): Promise<Array<Partial<UnifiedReport>>> {
  const slice = resolveCrossCategorySlice(filters.category);
  if (!shouldFetchEvaluationsForCategory(slice)) return [];

  const out: Array<Partial<UnifiedReport>> = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = supabase
      .from("service_ratings")
      .select(
        "id, sentiment, rating_text, created_at, user_id, public_services!inner(district, latitude, longitude, address, service_type, name)",
      )
      .eq("publication_status", "published")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    query = applyCrossAnalyticsDateFilters(query, filters);
    if (!slice.isAll) {
      query = query.in("public_services.service_type", slice.publicServiceTypes);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      sentiment: string | null;
      created_at: string | null;
      user_id: string | null;
      public_services:
        | {
            district: string | null;
            latitude: number | null;
            longitude: number | null;
            address: string | null;
            service_type: string | null;
            name: string | null;
          }
        | {
            district: string | null;
            latitude: number | null;
            longitude: number | null;
            address: string | null;
            service_type: string | null;
            name: string | null;
          }[]
        | null;
      rating_text: string | null;
    }>;
    rows.forEach((r) => {
      const svc = Array.isArray(r.public_services) ? r.public_services[0] : r.public_services;
      out.push({
        id: r.id,
        category: "Avaliação",
        status: "published",
        severity: null,
        neighborhood: svc?.district ?? null,
        latitude: svc?.latitude ?? null,
        longitude: svc?.longitude ?? null,
        createdAt: r.created_at,
        sentimentRaw: r.sentiment,
        source: "manual",
        userId: r.user_id,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchDemographics(userIds: string[]): Promise<Map<string, DemoMap>> {
  const map = new Map<string, DemoMap>();
  if (userIds.length === 0) return map;
  const CHUNK = 200;
  const today = Date.now();
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const slice = userIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("user_demographics")
      .select("user_id, gender, race, social_class, birth_date")
      .in("user_id", slice);
    (data ?? []).forEach((d) => {
      const row = d as {
        user_id: string;
        gender: string | null;
        race: string | null;
        social_class: string | null;
        birth_date: string | null;
      };
      let age: number | null = null;
      if (row.birth_date) {
        const bd = new Date(row.birth_date).getTime();
        if (!Number.isNaN(bd)) {
          age = Math.floor((today - bd) / (365.25 * 24 * 3600 * 1000));
        }
      }
      map.set(row.user_id, {
        gender: row.gender,
        race: row.race,
        social_class: row.social_class,
        age,
      });
    });
  }
  return map;
}

function attachDemographics(
  reports: Array<Partial<UnifiedReport>>,
  demoMap: Map<string, DemoMap>,
): UnifiedReport[] {
  return reports.map((r) => {
    const d = r.userId ? demoMap.get(r.userId) : undefined;
    return {
      id: r.id || "",
      category: r.category || "Urbano",
      status: r.status ?? null,
      severity: r.severity ?? null,
      neighborhood: r.neighborhood ?? null,
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      createdAt: r.createdAt ?? null,
      sentimentRaw: r.sentimentRaw ?? null,
      source: r.source ?? "unknown",
      userId: r.userId ?? null,
      demoGender: d?.gender ?? null,
      demoRace: d?.race ?? null,
      demoSocialClass: d?.social_class ?? null,
      demoAge: d?.age ?? null,
    };
  });
}

/**
 * Agrega a matriz `rowDim × colDim` a partir de relatos unificados.
 * Exportado para testes diretos.
 */
export function buildMatrix(
  reports: UnifiedReport[],
  rowDim: DimensionKey,
  colDim: DimensionKey,
): CrossCellMatrix {
  const rowDef = DIMENSIONS[rowDim];
  const colDef = DIMENSIONS[colDim];

  const cells: Record<string, number> = {};
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();
  let total = 0;
  let maxCount = 0;

  reports.forEach((r) => {
    const rowVal = rowDef.extract(r);
    const colVal = colDef.extract(r);
    const key = `${rowVal}|${colVal}`;
    cells[key] = (cells[key] || 0) + 1;
    rowTotals.set(rowVal, (rowTotals.get(rowVal) || 0) + 1);
    colTotals.set(colVal, (colTotals.get(colVal) || 0) + 1);
    total += 1;
    if (cells[key] > maxCount) maxCount = cells[key];
  });

  // Ordena por total desc; mantém valores canônicos da dimensão (pode ter zeros)
  const rowValues = Array.from(rowTotals.entries())
    .map(([value, t]) => ({ value, label: rowDef.valueLabel(value), total: t }))
    .sort((a, b) => b.total - a.total);
  const colValues = Array.from(colTotals.entries())
    .map(([value, t]) => ({ value, label: colDef.valueLabel(value), total: t }))
    .sort((a, b) => b.total - a.total);

  return { rowDim, colDim, rowValues, colValues, cells, total, maxCount };
}

export interface UseCrossDimensionResult {
  matrix: CrossCellMatrix;
  reports: UnifiedReport[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  /** Retorna os relatos que casam com `(rowValue, colValue)` para drill-into. */
  getReportsForCell: (rowValue: string, colValue: string) => UnifiedReport[];
}

export function useCrossDimensionAnalytics(
  rowDim: DimensionKey,
  colDim: DimensionKey,
  filters: ReportsAnalyticsFilters = {},
): UseCrossDimensionResult {
  const [reports, setReports] = useState<UnifiedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const isFirstLoadRef = useRef(true);

  const filterKey = useMemo(
    () =>
      [
        filters.startDate ?? "",
        filters.endDate ?? "",
        filters.region ?? "",
        filters.category ?? "",
      ].join("|"),
    [filters.startDate, filters.endDate, filters.region, filters.category],
  );

  const fetchAll = useCallback(async () => {
    const showSpinner = isFirstLoadRef.current;
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      const [urban, transport, service] = await Promise.all([
        fetchUrban(filters),
        fetchTransport(filters),
        fetchService(filters),
      ]);
      const partial = [...urban, ...transport, ...service];
      const userIds = Array.from(
        new Set(partial.map((r) => r.userId).filter((id): id is string => !!id)),
      );
      const demoMap = await fetchDemographics(userIds);
      const merged = attachDemographics(partial, demoMap);
      setReports(filterUnifiedReportsByRegion(merged, filters.region));
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useCrossDimensionAnalytics] fetch error", err);
      setError("Não foi possível carregar dados para cruzamento.");
      if (isFirstLoadRef.current) setReports([]);
    } finally {
      isFirstLoadRef.current = false;
      setIsLoading(false);
    }
  }, [filterKey, filters.startDate, filters.endDate, filters.region, filters.category]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useRealtimeRefresh(ANALYTICS_REALTIME_FULL, fetchAll);

  const matrix = useMemo(
    () => (reports.length ? buildMatrix(reports, rowDim, colDim) : EMPTY_MATRIX),
    [reports, rowDim, colDim],
  );

  const getReportsForCell = useCallback(
    (rowValue: string, colValue: string) => {
      const rowDef = DIMENSIONS[rowDim];
      const colDef = DIMENSIONS[colDim];
      return reports.filter(
        (r) => rowDef.extract(r) === rowValue && colDef.extract(r) === colValue,
      );
    },
    [reports, rowDim, colDim],
  );

  return {
    matrix,
    reports,
    isLoading,
    error,
    lastUpdate,
    refresh: fetchAll,
    getReportsForCell,
  };
}

// Helpers exportados para teste
export const __test__ = { buildMatrix, attachDemographics };
