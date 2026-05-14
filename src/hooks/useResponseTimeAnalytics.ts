import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bairroParaZona, type ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";
import { applyAnalyticsFilters } from "@/lib/analyticsFilterHelpers";
import { slaWindowToHours } from "@/lib/analyticsFilters";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/**
 * HU-1.2 — Como gestor, quero visualizar tempo médio de resposta e tendência
 * para monitorar eficiência operacional.
 *
 * Define "tempo de resposta" como tempo até a RESOLUÇÃO final do relato:
 *   - urban_reports / transport_reports: usa updated_at - created_at quando status = 'resolved'
 *     (essas tabelas não têm resolved_at; updated_at é proxy razoável).
 *   - council_member_referrals: usa resolved_at - sent_at (campos dedicados).
 *
 * Exposições do hook:
 *   - avgHours (período atual) e avgHoursPrevious (mesma janela imediatamente anterior)
 *     -> permite calcular delta e direção (melhorou/piorou).
 *   - trend: série temporal diária do tempo médio.
 *   - byType / bySeverity / byCategory / byRegion: breakdowns ordenados.
 */

export type EfficiencySource = "urbano" | "transporte" | "encaminhamento";

export interface ResponseTimeFilters {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** HU-5.2 — filtros adicionais opcionais (aplicados no client). */
  categories?: string[];
  regions?: string[];
  zones?: import("@/lib/regionMapping").ZonaVolumeOuDesconhecida[];
  /** HU-14.4 — facet específico da aba Eficiência. */
  facet?: import("@/lib/analyticsFilters").EficienciaFacet;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  avgHours: number;
  count: number;
}

export interface BreakdownItem {
  label: string;
  avgHours: number;
  count: number;
}

export interface ByTypeItem {
  source: EfficiencySource;
  avgHours: number;
  count: number;
}

export interface ResponseTimeStats {
  /** Total de itens resolvidos no período. */
  count: number;
  /** Tempo médio em horas, no período atual. */
  avgHours: number;
  /** Tempo médio em horas, no período imediatamente anterior (mesma duração). */
  avgHoursPrevious: number;
  /** Mediana em horas, no período atual. */
  medianHours: number;
  /** Variação relativa em relação ao período anterior (em pontos percentuais; positivo = piorou). */
  deltaPct: number;
  /** Direção: 'melhorou' (atual < anterior), 'piorou' (atual > anterior), 'estavel' (sem dado anterior ou variação ≤ 1%). */
  direction: "melhorou" | "piorou" | "estavel";
  trend: TrendPoint[];
  byType: ByTypeItem[];
  bySeverity: BreakdownItem[];
  byCategory: BreakdownItem[];
  byRegion: BreakdownItem[];
}

const EMPTY_STATS: ResponseTimeStats = {
  count: 0,
  avgHours: 0,
  avgHoursPrevious: 0,
  medianHours: 0,
  deltaPct: 0,
  direction: "estavel",
  trend: [],
  byType: [],
  bySeverity: [],
  byCategory: [],
  byRegion: [],
  availableCategories: [],
  availableRegions: [],
};

interface ResolvedRecord {
  source: EfficiencySource;
  createdAt: string;
  resolvedAt: string;
  hours: number;
  category: string;
  severity: string;
  region: string;
  zone: ZonaVolumeOuDesconhecida;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5; // até 5k registros por fonte

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function diffHours(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms > 0 ? ms / 36e5 : 0;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function safeText(value: unknown, fallback = "Não informado"): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : fallback;
}

async function fetchResolvedUrban(
  startIso: string | null,
  endIso: string | null,
): Promise<ResolvedRecord[]> {
  const out: ResolvedRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("urban_reports")
      .select("created_at, updated_at, status, category, severity, neighborhood")
      .eq("status", "resolved")
      .order("updated_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte("updated_at", startIso);
    if (endIso) q = q.lte("updated_at", endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      created_at: string | null;
      updated_at: string | null;
      status: string | null;
      category: string | null;
      severity: string | null;
      neighborhood: string | null;
    }>;
    rows.forEach((r) => {
      if (!r.created_at || !r.updated_at) return;
      const region = safeText(r.neighborhood, "Não informada");
      out.push({
        source: "urbano",
        createdAt: r.created_at,
        resolvedAt: r.updated_at,
        hours: diffHours(r.created_at, r.updated_at),
        category: safeText(r.category, "Sem categoria"),
        severity: safeText(r.severity, "Sem severidade"),
        region,
        zone: bairroParaZona(region === "Não informada" ? "" : region),
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchResolvedTransport(
  startIso: string | null,
  endIso: string | null,
): Promise<ResolvedRecord[]> {
  const out: ResolvedRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("transport_reports")
      .select(
        "created_at, updated_at, status, report_type, sub_category, severity, location, stop_location",
      )
      .eq("status", "resolved")
      .order("updated_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte("updated_at", startIso);
    if (endIso) q = q.lte("updated_at", endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      created_at: string | null;
      updated_at: string | null;
      status: string | null;
      report_type: string | null;
      sub_category: string | null;
      severity: string | null;
      location: string | null;
      stop_location: string | null;
    }>;
    rows.forEach((r) => {
      if (!r.created_at || !r.updated_at) return;
      const region = safeText(r.location || r.stop_location, "Não informada");
      out.push({
        source: "transporte",
        createdAt: r.created_at,
        resolvedAt: r.updated_at,
        hours: diffHours(r.created_at, r.updated_at),
        category: safeText(r.sub_category || r.report_type, "Sem categoria"),
        severity: safeText(r.severity, "Sem severidade"),
        region,
        zone: bairroParaZona(region === "Não informada" ? "" : region),
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchResolvedReferrals(
  startIso: string | null,
  endIso: string | null,
): Promise<ResolvedRecord[]> {
  const out: ResolvedRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("council_member_referrals")
      .select(
        "sent_at, created_at, resolved_at, council_member_party, transport_report_id, urban_report_id, service_rating_id",
      )
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte("resolved_at", startIso);
    if (endIso) q = q.lte("resolved_at", endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      sent_at: string | null;
      created_at: string | null;
      resolved_at: string | null;
      council_member_party: string | null;
    }>;
    rows.forEach((r) => {
      const start = r.sent_at || r.created_at;
      if (!start || !r.resolved_at) return;
      out.push({
        source: "encaminhamento",
        createdAt: start,
        resolvedAt: r.resolved_at,
        hours: diffHours(start, r.resolved_at),
        category: safeText(r.council_member_party, "Sem partido"),
        severity: "—",
        region: "Não informada",
        zone: bairroParaZona(""),
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

function buildBreakdown(
  records: ResolvedRecord[],
  pickKey: (r: ResolvedRecord) => string,
  excludeEmpty: string[] = [],
): BreakdownItem[] {
  const buckets = new Map<string, { sum: number; count: number }>();
  records.forEach((r) => {
    const key = pickKey(r);
    if (excludeEmpty.includes(key)) return;
    const slot = buckets.get(key) || { sum: 0, count: 0 };
    slot.sum += r.hours;
    slot.count += 1;
    buckets.set(key, slot);
  });
  return Array.from(buckets.entries())
    .map(([label, { sum, count }]) => ({
      label,
      avgHours: count > 0 ? sum / count : 0,
      count,
    }))
    .sort((a, b) => b.avgHours - a.avgHours);
}

function aggregate(
  current: ResolvedRecord[],
  previous: ResolvedRecord[],
  // HU-5.2 — listas para popular MultiSelects de filtros. Devem vir do conjunto
  // NÃO FILTRADO (para que selecionar PSOL não esconda UNIÃO do dropdown).
  allAvailableCategories: string[] = [],
  allAvailableRegions: string[] = [],
): ResponseTimeStats {
  const count = current.length;
  if (count === 0 && previous.length === 0) {
    return {
      ...EMPTY_STATS,
      availableCategories: allAvailableCategories,
      availableRegions: allAvailableRegions,
    };
  }

  const sumCurrent = current.reduce((acc, r) => acc + r.hours, 0);
  const avgHours = count > 0 ? sumCurrent / count : 0;

  const avgHoursPrevious =
    previous.length > 0
      ? previous.reduce((acc, r) => acc + r.hours, 0) / previous.length
      : 0;

  const deltaPct =
    avgHoursPrevious > 0 ? ((avgHours - avgHoursPrevious) / avgHoursPrevious) * 100 : 0;

  const direction: ResponseTimeStats["direction"] =
    avgHoursPrevious === 0
      ? "estavel"
      : Math.abs(deltaPct) <= 1
        ? "estavel"
        : avgHours < avgHoursPrevious
          ? "melhorou"
          : "piorou";

  // Trend diário do período atual
  const trendMap = new Map<string, { sum: number; count: number }>();
  current.forEach((r) => {
    const day = dayKey(r.resolvedAt);
    const slot = trendMap.get(day) || { sum: 0, count: 0 };
    slot.sum += r.hours;
    slot.count += 1;
    trendMap.set(day, slot);
  });
  const trend: TrendPoint[] = Array.from(trendMap.entries())
    .map(([date, { sum, count }]) => ({
      date,
      avgHours: count > 0 ? sum / count : 0,
      count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Breakdown por tipo (urbano/transporte/encaminhamento)
  const byTypeMap = new Map<EfficiencySource, { sum: number; count: number }>();
  current.forEach((r) => {
    const slot = byTypeMap.get(r.source) || { sum: 0, count: 0 };
    slot.sum += r.hours;
    slot.count += 1;
    byTypeMap.set(r.source, slot);
  });
  const byType: ByTypeItem[] = Array.from(byTypeMap.entries())
    .map(([source, { sum, count }]) => ({
      source,
      avgHours: count > 0 ? sum / count : 0,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Demais breakdowns
  const bySeverity = buildBreakdown(current, (r) => r.severity, ["—", "Sem severidade"]);
  const byCategory = buildBreakdown(current, (r) => r.category);
  const byRegion = buildBreakdown(current, (r) => `${r.zone}`);

  // HU-5.2 — listas para popular MultiSelects de filtros vêm do conjunto NÃO
  // filtrado (passadas como argumento). Fallback para o atual em caso de chamadas legadas.
  const availableCategories =
    allAvailableCategories.length > 0
      ? allAvailableCategories
      : Array.from(
          new Set(
            current
              .map((r) => r.category)
              .filter((c): c is string => !!c && c !== "Sem categoria"),
          ),
        ).sort();
  const availableRegions =
    allAvailableRegions.length > 0
      ? allAvailableRegions
      : Array.from(
          new Set(
            current
              .map((r) => r.region)
              .filter((r): r is string => !!r && r !== "Não informada"),
          ),
        ).sort();

  return {
    count,
    avgHours,
    avgHoursPrevious,
    medianHours: median(current.map((r) => r.hours)),
    deltaPct,
    direction,
    trend,
    byType,
    bySeverity,
    byCategory,
    byRegion,
    availableCategories,
    availableRegions,
  };
}

function previousWindow(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): { startIso: string | null; endIso: string | null } {
  if (!start || !end) return { startIso: null, endIso: null };
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const windowMs = e - s;
  if (windowMs <= 0) return { startIso: null, endIso: null };
  const prevEnd = new Date(s - 1).toISOString();
  const prevStart = new Date(s - 1 - windowMs).toISOString();
  return { startIso: prevStart, endIso: prevEnd };
}

export function useResponseTimeAnalytics(filters: ResponseTimeFilters) {
  const [stats, setStats] = useState<ResponseTimeStats>(EMPTY_STATS);
  // HU-5.3 — refetch silencioso (initial loading vs realtime/refetch).
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const periodKey = useMemo(() => {
    const s = toIso(filters.startDate) || "";
    const e = toIso(filters.endDate) || "";
    return `${s}|${e}`;
  }, [filters.startDate, filters.endDate, filters.categories, filters.regions, filters.zones]);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const startIso = toIso(filters.startDate);
      const endIso = toIso(filters.endDate);
      const prev = previousWindow(filters.startDate, filters.endDate);

      const [urbanCur, transCur, refCur, urbanPrev, transPrev, refPrev] = await Promise.all([
        fetchResolvedUrban(startIso, endIso),
        fetchResolvedTransport(startIso, endIso),
        fetchResolvedReferrals(startIso, endIso),
        prev.startIso ? fetchResolvedUrban(prev.startIso, prev.endIso) : Promise.resolve([]),
        prev.startIso ? fetchResolvedTransport(prev.startIso, prev.endIso) : Promise.resolve([]),
        prev.startIso ? fetchResolvedReferrals(prev.startIso, prev.endIso) : Promise.resolve([]),
      ]);

      const analyticsFilter = {
        categories: filters.categories,
        regions: filters.regions,
        zones: filters.zones,
      };
      const allCurrent = [...urbanCur, ...transCur, ...refCur];
      // HU-5.2 — listas de opções dos MultiSelects vêm do recorte ANTES dos filtros
      // adicionais (caso contrário selecionar PSOL esconde UNIÃO do dropdown).
      const allAvailableCategories = Array.from(
        new Set(
          allCurrent
            .map((r) => r.category)
            .filter((c): c is string => !!c && c !== "Sem categoria"),
        ),
      ).sort();
      const allAvailableRegions = Array.from(
        new Set(
          allCurrent
            .map((r) => r.region)
            .filter((r): r is string => !!r && r !== "Não informada"),
        ),
      ).sort();
      const currentBase = applyAnalyticsFilters(allCurrent, analyticsFilter);
      const previousBase = applyAnalyticsFilters(
        [...urbanPrev, ...transPrev, ...refPrev],
        analyticsFilter,
      );
      // HU-14.4 — aplicar facet específico da aba Eficiência (slaWindow + range).
      // Statuses do facet são ignorados aqui porque o hook só busca status='resolved'.
      const applyEfiFacet = (rows: ResolvedRecord[]): ResolvedRecord[] => {
        const f = filters.facet;
        if (!f) return rows;
        let out = rows;
        const slaH = f.slaWindow && f.slaWindow !== "all" ? slaWindowToHours(f.slaWindow) : null;
        if (slaH != null) out = out.filter((r) => r.hours <= slaH);
        if (f.responseMinDays != null) {
          const minH = f.responseMinDays * 24;
          out = out.filter((r) => r.hours >= minH);
        }
        if (f.responseMaxDays != null) {
          const maxH = f.responseMaxDays * 24;
          out = out.filter((r) => r.hours <= maxH);
        }
        return out;
      };
      const current = applyEfiFacet(currentBase);
      const previous = applyEfiFacet(previousBase);
      setStats(aggregate(current, previous, allAvailableCategories, allAvailableRegions));
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useResponseTimeAnalytics] fetch error", err);
      setError("Não foi possível carregar o tempo de resposta. Tente novamente.");
      // HU-5.3 — não resetar para EMPTY_STATS: mantém último resultado bom visível.
    } finally {
      setIsInitialLoading(false);
    }
    // HU-5.2 fix — incluir categories/regions/zones nas deps; sem isso o
    // fetchData fica com closure das categorias da 1ª render e o filtro
    // de partido político / categoria nunca era aplicado.
    // HU-14.4 — facet serializado pra estabilizar identidade do objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.startDate,
    filters.endDate,
    filters.categories,
    filters.regions,
    filters.zones,
    JSON.stringify(filters.facet),
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, periodKey]);

  // HU-5.3 — auto-refresh em novos relatos/encaminhamentos resolvidos.
  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  return {
    stats,
    isLoading: isInitialLoading,
    isInitialLoading,
    error,
    refresh: fetchData,
    lastUpdate,
  };
}

// HU-5.3 — tabelas observadas pelo realtime (referência estável fora do hook).
const REALTIME_TABLES = [
  "urban_reports",
  "transport_reports",
  "council_member_referrals",
] as const;

// Exposições para teste.
export const __test__ = {
  aggregate,
  buildBreakdown,
  diffHours,
  median,
  previousWindow,
};
