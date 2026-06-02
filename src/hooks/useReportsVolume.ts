import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bairroParaZona,
  ZONA_DESCONHECIDA,
  type ZonaVolumeOuDesconhecida,
} from "@/lib/regionMapping";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/**
 * HU-1.1 — Como gestor, quero visualizar volume de relatos por período,
 * categoria e região para analisar demanda.
 *
 * Hook focado em volume agregado para o painel administrativo. Lê diretamente
 * das tabelas `urban_reports`, `transport_reports` e `service_ratings`
 * (com join em `public_services`) aplicando os filtros do gestor, e produz:
 *   - total e quebra por tipo (urbano / transporte / avaliação)
 *   - timeline diária (para gráfico de evolução temporal)
 *   - volume por categoria
 *   - volume por região (bairro/distrito) e por zona da cidade
 */

export type ReportSourceType = "urbano" | "transporte" | "avaliacao";

export interface ReportsVolumeFilters {
  /** Início do período (inclusivo). */
  startDate?: Date | string | null;
  /** Fim do período (inclusivo). */
  endDate?: Date | string | null;
  /** Categorias selecionadas (multiseleção). Vazio = todas. */
  categories?: string[];
  /** Bairros/distritos selecionados (multiseleção). Vazio = todos. */
  regions?: string[];
  /** Zonas selecionadas (Norte/Sul/Leste/Oeste/Centro). Vazio = todas. */
  zones?: ZonaVolumeOuDesconhecida[];
  /** Tipos de relato a considerar. Default: todos. */
  types?: ReportSourceType[];
}

export interface VolumeByDay {
  date: string;
  urbano: number;
  transporte: number;
  avaliacao: number;
  total: number;
}

export interface VolumeByCategory {
  category: string;
  count: number;
  /** Tipo predominante na categoria (urbano/transporte/avaliacao). */
  source: ReportSourceType;
}

export interface VolumeByRegion {
  region: string;
  zone: ZonaVolumeOuDesconhecida;
  count: number;
}

export interface VolumeByZone {
  zone: ZonaVolumeOuDesconhecida;
  count: number;
}

export interface ReportsVolumeStats {
  total: number;
  urbano: number;
  transporte: number;
  avaliacao: number;
  timeline: VolumeByDay[];
  byCategory: VolumeByCategory[];
  byRegion: VolumeByRegion[];
  byZone: VolumeByZone[];
  /** Universo de categorias e regiões disponíveis nos dados (para popular filtros). */
  availableCategories: string[];
  availableRegions: string[];
}

const EMPTY_STATS: ReportsVolumeStats = {
  total: 0,
  urbano: 0,
  transporte: 0,
  avaliacao: 0,
  timeline: [],
  byCategory: [],
  byRegion: [],
  byZone: [],
  availableCategories: [],
  availableRegions: [],
};

interface RawReport {
  source: ReportSourceType;
  createdAt: string | null;
  category: string;
  region: string;
}

const PAGE_SIZE = 1000;
const MAX_PAGES_PER_TABLE = 5; // limite defensivo: até 5 mil linhas por tabela

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dayKey(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function normalizeCategory(value: unknown): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : "Sem categoria";
}

function normalizeRegion(value: unknown): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : "Não informada";
}

async function fetchUrbanReports(
  startIso: string | null,
  endIso: string | null,
): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES_PER_TABLE; page += 1) {
    let query = supabase
      .from("urban_reports")
      .select("created_at, category, neighborhood")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) query = query.gte("created_at", startIso);
    if (endIso) query = query.lte("created_at", endIso);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      created_at: string | null;
      category: string | null;
      neighborhood: string | null;
    }>;
    rows.forEach((r) =>
      out.push({
        source: "urbano",
        createdAt: r.created_at,
        category: normalizeCategory(r.category),
        region: normalizeRegion(r.neighborhood),
      }),
    );
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchTransportReports(
  startIso: string | null,
  endIso: string | null,
): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES_PER_TABLE; page += 1) {
    let query = supabase
      .from("transport_reports")
      .select("created_at, report_type, sub_category, location, stop_location")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) query = query.gte("created_at", startIso);
    if (endIso) query = query.lte("created_at", endIso);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      created_at: string | null;
      report_type: string | null;
      sub_category: string | null;
      location: string | null;
      stop_location: string | null;
    }>;
    rows.forEach((r) =>
      out.push({
        source: "transporte",
        createdAt: r.created_at,
        category: normalizeCategory(r.sub_category || r.report_type),
        region: normalizeRegion(r.location || r.stop_location),
      }),
    );
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchServiceRatings(
  startIso: string | null,
  endIso: string | null,
): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES_PER_TABLE; page += 1) {
    let query = supabase
      .from("service_ratings")
      .select("created_at, public_services(service_type, district)")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) query = query.gte("created_at", startIso);
    if (endIso) query = query.lte("created_at", endIso);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      created_at: string | null;
      public_services:
        | { service_type: string | null; district: string | null }
        | { service_type: string | null; district: string | null }[]
        | null;
    }>;
    rows.forEach((r) => {
      const svc = Array.isArray(r.public_services) ? r.public_services[0] : r.public_services;
      out.push({
        source: "avaliacao",
        createdAt: r.created_at,
        category: normalizeCategory(svc?.service_type),
        region: normalizeRegion(svc?.district),
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

function aggregate(rows: RawReport[], filters: ReportsVolumeFilters): ReportsVolumeStats {
  const selectedCategories = new Set((filters.categories || []).filter(Boolean));
  const selectedRegions = new Set((filters.regions || []).filter(Boolean));
  const selectedZones = new Set((filters.zones || []).filter(Boolean));
  const selectedTypes = new Set((filters.types || []) as ReportSourceType[]);

  const dayMap = new Map<string, VolumeByDay>();
  const categoryMap = new Map<string, { count: number; source: ReportSourceType }>();
  const regionMap = new Map<string, { count: number; zone: ZonaVolumeOuDesconhecida }>();
  const zoneMap = new Map<ZonaVolumeOuDesconhecida, number>();
  const availableCategories = new Set<string>();
  const availableRegions = new Set<string>();

  let total = 0;
  let urbano = 0;
  let transporte = 0;
  let avaliacao = 0;

  rows.forEach((row) => {
    if (selectedTypes.size > 0 && !selectedTypes.has(row.source)) return;

    // alimenta universo disponível ANTES de aplicar os filtros de categoria/região
    availableCategories.add(row.category);
    availableRegions.add(row.region);

    const zone = bairroParaZona(row.region === "Não informada" ? "" : row.region);

    if (selectedCategories.size > 0 && !selectedCategories.has(row.category)) return;
    if (selectedRegions.size > 0 && !selectedRegions.has(row.region)) return;
    if (selectedZones.size > 0 && !selectedZones.has(zone)) return;

    total += 1;
    if (row.source === "urbano") urbano += 1;
    else if (row.source === "transporte") transporte += 1;
    else avaliacao += 1;

    const day = dayKey(row.createdAt);
    if (day) {
      const slot = dayMap.get(day) || {
        date: day,
        urbano: 0,
        transporte: 0,
        avaliacao: 0,
        total: 0,
      };
      slot[row.source] += 1;
      slot.total += 1;
      dayMap.set(day, slot);
    }

    const cat = categoryMap.get(row.category) || { count: 0, source: row.source };
    cat.count += 1;
    // mantém o source predominante: se já tinha um e agora difere, o source predominante
    // será recomputado abaixo. Aqui só registramos o último — corrige depois.
    cat.source = row.source;
    categoryMap.set(row.category, cat);

    const reg = regionMap.get(row.region) || { count: 0, zone };
    reg.count += 1;
    regionMap.set(row.region, reg);

    zoneMap.set(zone, (zoneMap.get(zone) || 0) + 1);
  });

  // Para cada categoria, calcula o source predominante de fato olhando rows
  const categorySourceCount = new Map<string, Map<ReportSourceType, number>>();
  rows.forEach((row) => {
    if (selectedTypes.size > 0 && !selectedTypes.has(row.source)) return;
    if (selectedCategories.size > 0 && !selectedCategories.has(row.category)) return;
    if (selectedRegions.size > 0 && !selectedRegions.has(row.region)) return;
    const zone = bairroParaZona(row.region === "Não informada" ? "" : row.region);
    if (selectedZones.size > 0 && !selectedZones.has(zone)) return;

    const inner = categorySourceCount.get(row.category) || new Map<ReportSourceType, number>();
    inner.set(row.source, (inner.get(row.source) || 0) + 1);
    categorySourceCount.set(row.category, inner);
  });

  const byCategory: VolumeByCategory[] = Array.from(categoryMap.entries())
    .map(([category, info]) => {
      const sources = categorySourceCount.get(category);
      let predominant: ReportSourceType = info.source;
      if (sources) {
        let max = -1;
        sources.forEach((count, src) => {
          if (count > max) {
            max = count;
            predominant = src;
          }
        });
      }
      return { category, count: info.count, source: predominant };
    })
    .sort((a, b) => b.count - a.count);

  const byRegion: VolumeByRegion[] = Array.from(regionMap.entries())
    .map(([region, info]) => ({ region, zone: info.zone, count: info.count }))
    .sort((a, b) => b.count - a.count);

  const byZone: VolumeByZone[] = Array.from(zoneMap.entries())
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count);

  const timeline = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    total,
    urbano,
    transporte,
    avaliacao,
    timeline,
    byCategory,
    byRegion,
    byZone,
    availableCategories: Array.from(availableCategories).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    ),
    availableRegions: Array.from(availableRegions).sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

export function useReportsVolume(filters: ReportsVolumeFilters) {
  const [stats, setStats] = useState<ReportsVolumeStats>(EMPTY_STATS);
  // HU-5.3 — distinção entre carga inicial (mostra skeleton) e refetch silencioso
  // (ao vivo, mantém valores anteriores enquanto a nova consulta carrega).
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Chave estável para refetch quando o período muda. Categoria/região/zona são
  // aplicados em memória sobre os dados do período corrente — evita round-trip.
  const periodKey = useMemo(() => {
    const start = toIso(filters.startDate) || "";
    const end = toIso(filters.endDate) || "";
    return `${start}|${end}`;
  }, [filters.startDate, filters.endDate]);

  const [rawRows, setRawRows] = useState<RawReport[]>([]);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const startIso = toIso(filters.startDate);
      const endIso = toIso(filters.endDate);
      const [urban, transport, ratings] = await Promise.all([
        fetchUrbanReports(startIso, endIso),
        fetchTransportReports(startIso, endIso),
        fetchServiceRatings(startIso, endIso),
      ]);
      setRawRows([...urban, ...transport, ...ratings]);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useReportsVolume] fetch error", err);
      setError("Não foi possível carregar o volume de relatos. Tente novamente.");
      // HU-5.3 — não resetar rawRows em refetches: mantém dados visíveis enquanto investiga.
      // Em carga inicial (rawRows ainda vazio) não há o que perder.
    } finally {
      setIsInitialLoading(false);
    }
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, periodKey]);

  // HU-5.3 — auto-refresh quando dados upstream mudam (novos relatos, mudanças
  // de status). Debounce de 600ms já está dentro do useRealtimeRefresh.
  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  // Re-agrega sempre que filtros derivados (categoria/região/zona/tipo) mudam.
  // O fetch só roda quando o período muda — agregação é barata e roda em memória.
  // HU-5.2 fix — depender da chave estável JSON.stringify em vez da referência do objeto
  // `filters`, que muda em todo render quando o caller passa objeto literal (ex.: o hook
  // useReportsVolumeCompare). Sem isso, há loop infinito: novo filters → useEffect refaz →
  // setStats → re-render → novo filters.
  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        c: filters.categories ?? [],
        r: filters.regions ?? [],
        z: filters.zones ?? [],
        t: filters.types ?? [],
      }),
    [filters.categories, filters.regions, filters.zones, filters.types],
  );
  useEffect(() => {
    setStats(aggregate(rawRows, filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRows, filtersKey]);

  return {
    stats,
    // HU-5.3 — isLoading agora reflete apenas a primeira carga. Refetches por
    // realtime/filtros são silenciosos. Componentes que precisam de spinner em
    // refetch manual podem usar `refresh()` + estado próprio.
    isLoading: isInitialLoading,
    isInitialLoading,
    error,
    refresh: fetchData,
    lastUpdate,
  };
}

// HU-5.3 — tabelas que disparam refetch automático em mudanças. Lista
// constante (fora do hook) para preservar referência estável entre renders.
const REALTIME_TABLES = ["urban_reports", "transport_reports", "service_ratings"] as const;

// Helpers exportados para reúso em testes.
export const __test__ = { aggregate };
