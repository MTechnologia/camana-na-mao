import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyAnalyticsFilters } from "@/lib/analyticsFilterHelpers";
import { applyCriticidadeFacet } from "@/lib/applyFacets";
import { bairroParaZona, type ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/**
 * HU-1.3 — Como gestor, quero visualizar sentimento agregado e padrões
 * recorrentes para identificar criticidade.
 *
 * Consolida 4 sinais para produzir um "Score de Criticidade" 0-100 por
 * categoria e por zona da cidade:
 *   - Volume (rank percentil de quantidade dentro do recorte)
 *   - % de relatos com sentimento negativo
 *   - % de relatos com severidade crítica/alta
 *   - Quantidade de padrões recorrentes ativos
 *
 * Cada componente recebe peso 0.25 (média simples). A intenção é dar ao gestor
 * um ranking acionável de "onde focar" sem inventar uma fórmula complicada.
 */

export interface DiagnosticoFilters {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /** HU-5.2 — filtros adicionais opcionais. */
  categories?: string[];
  regions?: string[];
  zones?: import("@/lib/regionMapping").ZonaVolumeOuDesconhecida[];
  /** HU-14.3 — facet específico da aba Diagnóstico/Criticidade. */
  facet?: import("@/lib/analyticsFilters").CriticidadeFacet;
}

export interface ScoreBreakdown {
  /** 0-100, normalizado por percentil dentro do recorte. */
  volumeScore: number;
  /** 0-100, percentual direto. */
  negativeScore: number;
  /** 0-100, percentual direto. */
  criticalScore: number;
  /** 0-100, normalizado para 0..5 padrões ativos. */
  patternScore: number;
}

export interface CategoryDiagnostic {
  category: string;
  total: number;
  negativePct: number;
  criticalPct: number;
  patternsActive: number;
  score: number; // 0-100
  breakdown: ScoreBreakdown;
}

export interface RegionDiagnostic {
  zone: ZonaVolumeOuDesconhecida;
  total: number;
  negativePct: number;
  criticalPct: number;
  patternsActive: number;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface PatternEntry {
  id: string;
  description: string;
  occurrenceCount: number;
  patternType: string;
  status: string;
  suggestedAction: string | null;
  peakHours: number[] | null;
  firstDetectedAt: string | null;
  lastOccurrenceAt: string | null;
  avgSeverity: number | null;
  averageSeverity: string | null;
}

export interface DiagnosticoStats {
  /** KPIs globais. */
  globalScore: number;
  totalRecords: number;
  totalNegative: number;
  totalCritical: number;
  totalPatterns: number;

  /** Top 10 categorias mais críticas. */
  topCategories: CategoryDiagnostic[];
  /** Top 10 regiões (zonas) mais críticas. */
  topRegions: RegionDiagnostic[];
  /** Top 10 padrões ativos. */
  topPatterns: PatternEntry[];
  /** HU-5.2 — listas para popular MultiSelect */
  availableCategories: string[];
  availableRegions: string[];
}

const EMPTY_STATS: DiagnosticoStats = {
  globalScore: 0,
  totalRecords: 0,
  totalNegative: 0,
  totalCritical: 0,
  totalPatterns: 0,
  topCategories: [],
  topRegions: [],
  topPatterns: [],
  availableCategories: [],
  availableRegions: [],
};

interface RawReport {
  category: string;
  region: string;
  zone: ZonaVolumeOuDesconhecida;
  isNegative: boolean;
  isCritical: boolean;
  // HU-14.3 — campos crus pra aplicação do CriticidadeFacet.
  severity?: string | null;
  /** Banco grava como jsonb array de strings em urban_reports; transport não tem. */
  active_consequences?: string | string[] | null;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;
const PATTERN_SCORE_CEIL = 5; // ≥5 padrões ativos = score 100 da dimensão "padrões"
const SCORE_WEIGHT = 0.25;

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function safeText(value: unknown, fallback: string): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : fallback;
}

function isNegativeSentiment(value: unknown): boolean {
  const s = (value as string | null | undefined)?.toString().toLowerCase();
  if (!s) return false;
  return s.includes("negativ");
}

function isCriticalSeverity(value: unknown): boolean {
  const s = (value as string | null | undefined)?.toString().toLowerCase();
  if (!s) return false;
  return s.includes("crit") || s.includes("crít") || s.includes("alto") || s === "alta";
}

async function fetchUrbanForDiagnostico(
  startIso: string | null,
  endIso: string | null,
): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("urban_reports")
      .select(
        "category, neighborhood, severity, active_consequences, ai_classification, created_at",
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte("created_at", startIso);
    if (endIso) q = q.lte("created_at", endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      category: string | null;
      neighborhood: string | null;
      severity: string | null;
      /** urban_reports.active_consequences é jsonb (geralmente array de strings). */
      active_consequences: string[] | string | null;
      ai_classification: { sentiment?: string } | null;
    }>;
    rows.forEach((r) => {
      const region = safeText(r.neighborhood, "Não informada");
      out.push({
        category: safeText(r.category, "Sem categoria"),
        region,
        zone: bairroParaZona(region === "Não informada" ? "" : region),
        isNegative: isNegativeSentiment(r.ai_classification?.sentiment),
        isCritical: isCriticalSeverity(r.severity),
        // HU-14.3 — crus pra facet
        severity: r.severity,
        active_consequences: r.active_consequences,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchTransportForDiagnostico(
  startIso: string | null,
  endIso: string | null,
): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("transport_reports")
      .select(
        "report_type, sub_category, location, stop_location, severity, ai_sentiment, created_at",
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte("created_at", startIso);
    if (endIso) q = q.lte("created_at", endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      report_type: string | null;
      sub_category: string | null;
      location: string | null;
      stop_location: string | null;
      severity: string | null;
      ai_sentiment: string | null;
    }>;
    rows.forEach((r) => {
      const region = safeText(r.location || r.stop_location, "Não informada");
      out.push({
        category: safeText(r.sub_category || r.report_type, "Sem categoria"),
        region,
        zone: bairroParaZona(region === "Não informada" ? "" : region),
        isNegative: isNegativeSentiment(r.ai_sentiment),
        isCritical: isCriticalSeverity(r.severity),
        // HU-14.3 — crus pra facet (transport não tem active_consequences)
        severity: r.severity,
        active_consequences: null,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchActivePatterns(): Promise<PatternEntry[]> {
  const { data, error } = await supabase
    .from("report_patterns")
    .select(
      "id, description, occurrence_count, pattern_type, status, suggested_action, peak_hours, first_detected_at, last_occurrence_at, avg_severity, average_severity",
    )
    .eq("status", "active")
    .order("occurrence_count", { ascending: false })
    .limit(50);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    description: string;
    occurrence_count: number | null;
    pattern_type: string;
    status: string | null;
    suggested_action: string | null;
    peak_hours: unknown;
    first_detected_at: string | null;
    last_occurrence_at: string | null;
    avg_severity: number | null;
    average_severity: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    occurrenceCount: r.occurrence_count ?? 0,
    patternType: r.pattern_type,
    status: r.status ?? "active",
    suggestedAction: r.suggested_action,
    peakHours: Array.isArray(r.peak_hours) ? (r.peak_hours as number[]) : null,
    firstDetectedAt: r.first_detected_at,
    lastOccurrenceAt: r.last_occurrence_at,
    avgSeverity: r.avg_severity,
    averageSeverity: r.average_severity,
  }));
}

/**
 * Conta padrões ativos cuja descrição menciona a chave (categoria ou zona).
 * Heurística simples e barata: como `report_patterns` não tem foreign key
 * direta para categoria/zona, usamos match textual case-insensitive.
 */
function countPatternsForKey(key: string, patterns: PatternEntry[]): number {
  if (!key || patterns.length === 0) return 0;
  const needle = key.toLowerCase();
  return patterns.filter((p) => p.description.toLowerCase().includes(needle)).length;
}

function normalizeVolumePercentile(values: number[]): Map<number, number> {
  // Retorna mapa valor→percentil 0-100. Empates compartilham o percentil médio.
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const result = new Map<number, number>();
  if (n === 0) return result;
  if (n === 1) {
    result.set(sorted[0], 100);
    return result;
  }
  const seen = new Set<number>();
  sorted.forEach((v, i) => {
    if (seen.has(v)) return;
    seen.add(v);
    // Percentil da posição: i + 0.5 / n para evitar 0 absoluto
    const percentile = ((i + 0.5) / n) * 100;
    result.set(v, percentile);
  });
  return result;
}

export function computeScore(b: ScoreBreakdown): number {
  const raw =
    b.volumeScore * SCORE_WEIGHT +
    b.negativeScore * SCORE_WEIGHT +
    b.criticalScore * SCORE_WEIGHT +
    b.patternScore * SCORE_WEIGHT;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function buildBreakdown(
  total: number,
  negativeCount: number,
  criticalCount: number,
  patternsActive: number,
  volumePercentile: number,
): ScoreBreakdown {
  return {
    volumeScore: Math.round(volumePercentile),
    negativeScore: total > 0 ? Math.round((negativeCount / total) * 100) : 0,
    criticalScore: total > 0 ? Math.round((criticalCount / total) * 100) : 0,
    patternScore: Math.min(100, Math.round((patternsActive / PATTERN_SCORE_CEIL) * 100)),
  };
}

export function aggregate(
  records: RawReport[],
  patterns: PatternEntry[],
  // HU-5.2 — listas de opções dos MultiSelects. Devem vir do conjunto NÃO
  // FILTRADO para não esconder opções conforme o usuário seleciona.
  allAvailableCategories: string[] = [],
  allAvailableRegions: string[] = [],
): DiagnosticoStats {
  if (records.length === 0 && patterns.length === 0) {
    return {
      ...EMPTY_STATS,
      availableCategories: allAvailableCategories,
      availableRegions: allAvailableRegions,
    };
  }

  // Por categoria
  const catMap = new Map<string, { total: number; neg: number; crit: number }>();
  records.forEach((r) => {
    const slot = catMap.get(r.category) || { total: 0, neg: 0, crit: 0 };
    slot.total += 1;
    if (r.isNegative) slot.neg += 1;
    if (r.isCritical) slot.crit += 1;
    catMap.set(r.category, slot);
  });
  const catVolumes = Array.from(catMap.values()).map((v) => v.total);
  const catVolumeMap = normalizeVolumePercentile(catVolumes);

  const topCategories: CategoryDiagnostic[] = Array.from(catMap.entries())
    .map(([category, info]) => {
      const patternsActive = countPatternsForKey(category, patterns);
      const breakdown = buildBreakdown(
        info.total,
        info.neg,
        info.crit,
        patternsActive,
        catVolumeMap.get(info.total) ?? 0,
      );
      return {
        category,
        total: info.total,
        negativePct: breakdown.negativeScore,
        criticalPct: breakdown.criticalScore,
        patternsActive,
        score: computeScore(breakdown),
        breakdown,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Por zona
  const zoneMap = new Map<
    ZonaVolumeOuDesconhecida,
    { total: number; neg: number; crit: number }
  >();
  records.forEach((r) => {
    const slot = zoneMap.get(r.zone) || { total: 0, neg: 0, crit: 0 };
    slot.total += 1;
    if (r.isNegative) slot.neg += 1;
    if (r.isCritical) slot.crit += 1;
    zoneMap.set(r.zone, slot);
  });
  const zoneVolumes = Array.from(zoneMap.values()).map((v) => v.total);
  const zoneVolumeMap = normalizeVolumePercentile(zoneVolumes);

  const topRegions: RegionDiagnostic[] = Array.from(zoneMap.entries())
    .map(([zone, info]) => {
      const patternsActive = countPatternsForKey(zone, patterns);
      const breakdown = buildBreakdown(
        info.total,
        info.neg,
        info.crit,
        patternsActive,
        zoneVolumeMap.get(info.total) ?? 0,
      );
      return {
        zone,
        total: info.total,
        negativePct: breakdown.negativeScore,
        criticalPct: breakdown.criticalScore,
        patternsActive,
        score: computeScore(breakdown),
        breakdown,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Globais
  const totalRecords = records.length;
  const totalNegative = records.filter((r) => r.isNegative).length;
  const totalCritical = records.filter((r) => r.isCritical).length;
  const globalBreakdown = buildBreakdown(
    totalRecords,
    totalNegative,
    totalCritical,
    patterns.length,
    100, // visão global "satura" o percentil de volume
  );
  const globalScore = totalRecords === 0 && patterns.length === 0 ? 0 : computeScore(globalBreakdown);

  // HU-5.2 — usa listas pré-calculadas (não filtradas) quando disponíveis,
  // fallback para reduzir dos records atuais (compatibilidade com testes legados).
  const availableCategories =
    allAvailableCategories.length > 0
      ? allAvailableCategories
      : Array.from(
          new Set(
            records
              .map((r) => r.category)
              .filter((c): c is string => !!c && c !== "Sem categoria"),
          ),
        ).sort();
  const availableRegions =
    allAvailableRegions.length > 0
      ? allAvailableRegions
      : Array.from(
          new Set(
            records
              .map((r) => r.region)
              .filter((r): r is string => !!r && r !== "Não informada"),
          ),
        ).sort();

  return {
    globalScore,
    totalRecords,
    totalNegative,
    totalCritical,
    totalPatterns: patterns.length,
    topCategories,
    topRegions,
    topPatterns: patterns.slice(0, 10),
    availableCategories,
    availableRegions,
  };
}

export function useDiagnosticoCriticidade(filters: DiagnosticoFilters) {
  const [stats, setStats] = useState<DiagnosticoStats>(EMPTY_STATS);
  // HU-5.3 — refetch silencioso.
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
      const [urban, transport, patterns] = await Promise.all([
        fetchUrbanForDiagnostico(startIso, endIso),
        fetchTransportForDiagnostico(startIso, endIso),
        fetchActivePatterns(),
      ]);
      // HU-5.2 — aplica filtros adicionais no client
      const analyticsFilter = {
        categories: filters.categories,
        regions: filters.regions,
        zones: filters.zones,
      };
      const allRecords = [...urban, ...transport];
      // Listas de opções para MultiSelects vêm do conjunto ANTES dos filtros
      // adicionais (caso contrário ao selecionar uma categoria as outras somem).
      const allAvailableCategories = Array.from(
        new Set(
          allRecords
            .map((r) => r.category)
            .filter((c): c is string => !!c && c !== "Sem categoria"),
        ),
      ).sort();
      const allAvailableRegions = Array.from(
        new Set(
          allRecords
            .map((r) => r.region)
            .filter((r): r is string => !!r && r !== "Não informada"),
        ),
      ).sort();
      const filtered = applyAnalyticsFilters(allRecords, analyticsFilter);
      // HU-14.3 — aplica facet específico da aba Diagnóstico/Criticidade.
      const facetFiltered = applyCriticidadeFacet(filtered, filters.facet);
      setStats(aggregate(facetFiltered, patterns, allAvailableCategories, allAvailableRegions));
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useDiagnosticoCriticidade] fetch error", err);
      setError("Não foi possível carregar o diagnóstico. Tente novamente.");
      // HU-5.3 — não resetar stats em erro: mantém último resultado bom visível.
    } finally {
      setIsInitialLoading(false);
    }
    // HU-5.2 fix — incluir categories/regions/zones nas deps; sem isso o
    // fetchData fica com closure dos filtros da 1ª render e mudanças em
    // categorias/bairros/zonas nunca disparam re-fetch/re-filter.
    // HU-14.3 — incluir facet também (JSON.stringify estabiliza identidade).
    // TODO: separar fetch (período+base) de re-agregação (facet) para evitar
    // re-fetch quando só o facet mudou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.categories, filters.regions, filters.zones, JSON.stringify(filters.facet)]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, periodKey]);

  // HU-5.3 — realtime: novos relatos, mudanças de status e novos padrões detectados.
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

// HU-5.3 — tabelas observadas (referência estável).
const REALTIME_TABLES = ["urban_