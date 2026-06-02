import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/**
 * HU-9.1 — Lista completa de padrões detectados pela IA.
 *
 * Diferente de `useReportPatterns` (que filtra ativos por linha), expõe TODOS
 * os padrões e permite filtros por tipo/status/severidade/período. Atualiza
 * via realtime quando a edge function `analyze-patterns` insere/atualiza
 * linhas em `report_patterns`.
 */

const TABLE = "report_patterns" as const;
const REALTIME_TABLES = [TABLE] as const;

export type PatternStatus = "active" | "resolved" | "ignored" | "monitoring";

export interface PatternEntry {
  id: string;
  description: string;
  patternType: string;
  status: PatternStatus | string;
  occurrenceCount: number;
  averageSeverity: string | null;
  avgSeverity: number | null;
  suggestedAction: string | null;
  lineId: string | null;
  peakHours: number[] | null;
  firstDetectedAt: string | null;
  lastOccurrenceAt: string | null;
  lastAnalyzedAt: string | null;
  windowStart: string | null;
  windowEnd: string | null;
}

export interface PatternsFilters {
  /** Vazio = todos. */
  statuses?: PatternStatus[];
  /** Vazio = todos. Match exato em pattern_type. */
  types?: string[];
  /** Filtra padrões com avg_severity >= valor (1=baixa, 4=crítica). */
  minSeverity?: number;
  /** Filtra por janela: pattern deve ter window_end >= startDate. */
  startDate?: Date | string | null;
}

export interface UsePatternsListResult {
  patterns: PatternEntry[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  /** Tipos únicos encontrados nos resultados (para popular o filtro). */
  availableTypes: string[];
  /** Status únicos. */
  availableStatuses: string[];
  refresh: () => Promise<void>;
}

interface RawRow {
  id: string;
  description: string;
  pattern_type: string;
  status: string | null;
  occurrence_count: number | null;
  average_severity: string | null;
  avg_severity: number | null;
  suggested_action: string | null;
  line_id: string | null;
  peak_hours: unknown;
  first_detected_at: string | null;
  last_occurrence_at: string | null;
  last_analyzed_at: string | null;
  window_start: string | null;
  window_end: string | null;
}

function parsePeakHours(raw: unknown): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 23);
  }
  if (typeof raw === "object" && raw !== null) {
    // Pode vir como { hour: count } map
    const obj = raw as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([, v]) => Number(v) > 0)
      .map(([k]) => Number(k))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 23);
  }
  if (typeof raw === "string") {
    try {
      return parsePeakHours(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return null;
}

function toModel(row: RawRow): PatternEntry {
  return {
    id: row.id,
    description: row.description,
    patternType: row.pattern_type,
    status: (row.status ?? "active") as PatternStatus,
    occurrenceCount: row.occurrence_count ?? 0,
    averageSeverity: row.average_severity,
    avgSeverity: row.avg_severity,
    suggestedAction: row.suggested_action,
    lineId: row.line_id,
    peakHours: parsePeakHours(row.peak_hours),
    firstDetectedAt: row.first_detected_at,
    lastOccurrenceAt: row.last_occurrence_at,
    lastAnalyzedAt: row.last_analyzed_at,
    windowStart: row.window_start,
    windowEnd: row.window_end,
  };
}

function toIsoStart(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function usePatternsList(filters: PatternsFilters = {}): UsePatternsListResult {
  const [patterns, setPatterns] = useState<PatternEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        s: filters.statuses ?? [],
        t: filters.types ?? [],
        m: filters.minSeverity ?? null,
        d: toIsoStart(filters.startDate),
      }),
    [filters.statuses, filters.types, filters.minSeverity, filters.startDate],
  );

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      let q = supabase
        .from(TABLE)
        .select(
          "id, description, pattern_type, status, occurrence_count, average_severity, avg_severity, suggested_action, line_id, peak_hours, first_detected_at, last_occurrence_at, last_analyzed_at, window_start, window_end",
        );

      if (filters.statuses && filters.statuses.length > 0) {
        q = q.in("status", filters.statuses);
      }
      if (filters.types && filters.types.length > 0) {
        q = q.in("pattern_type", filters.types);
      }
      if (filters.minSeverity != null) {
        q = q.gte("avg_severity", filters.minSeverity);
      }
      const startIso = toIsoStart(filters.startDate);
      if (startIso) {
        q = q.gte("window_end", startIso);
      }

      q = q.order("occurrence_count", { ascending: false }).limit(500);

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      setPatterns((data ?? []).map((r) => toModel(r as RawRow)));
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[usePatternsList] fetch error", err);
      setError("Não foi possível carregar os padrões.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  const availableTypes = useMemo(() => {
    const set = new Set(patterns.map((p) => p.patternType).filter(Boolean));
    return Array.from(set).sort();
  }, [patterns]);

  const availableStatuses = useMemo(() => {
    const set = new Set(patterns.map((p) => p.status).filter(Boolean));
    return Array.from(set).sort();
  }, [patterns]);

  return {
    patterns,
    isLoading,
    error,
    lastUpdate,
    availableTypes,
    availableStatuses,
    refresh: fetchData,
  };
}

/**
 * Util exportado para testes e componentes que precisem derivar uma série de
 * 24 horas a partir do peak_hours. Retorna array de 24 com 0/1 indicando se
 * o pattern tem aquela hora marcada.
 */
export function peakHoursToVector(peakHours: number[] | null | undefined): number[] {
  const vec = Array.from({ length: 24 }, () => 0);
  if (!peakHours) return vec;
  for (const h of peakHours) {
    if (h >= 0 && h <= 23) vec[h] = 1;
  }
  return vec;
}

/** Soma vetores de peak_hours de vários padrões em uma série única (intensidade). */
export function aggregatePeakHours(patterns: PatternEntry[]): number[] {
  const acc = Array.from({ length: 24 }, () => 0);
  for (const p of patterns) {
    const vec = peakHoursToVector(p.peakHours);
    for (let i = 0; i < 24; i += 1) acc[i] += vec[i];
  }
  return acc;
}
