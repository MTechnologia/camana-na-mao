import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { AnomalyDirection, AnomalySeverity } from "@/lib/detectAnomalies";

/**
 * HU-9.3 — Hook que lê a tabela `report_anomalies` (preenchida pela edge
 * function `detect-anomalies`) com filtros + realtime + ações de workflow.
 *
 * Modelo simples sem paginação avançada — a tabela cresce ~1 linha por
 * anomalia detectada, então 500 linhas mais antigas/recentes é o teto.
 */

const TABLE = "report_anomalies" as const;
const REALTIME_TABLES = [TABLE] as const;

export type AnomalyStatus = "active" | "acknowledged" | "dismissed";

export interface AnomalyEntry {
  id: string;
  signalType: string;
  signalDate: string; // YYYY-MM-DD
  observedValue: number;
  expectedValue: number;
  expectedLower: number;
  expectedUpper: number;
  zScore: number;
  severity: AnomalySeverity;
  direction: AnomalyDirection;
  status: AnomalyStatus;
  notes: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnomaliesFilters {
  statuses?: AnomalyStatus[];
  severities?: AnomalySeverity[];
  /** Apenas anomalias com signal_date >= startDate. */
  startDate?: Date | string | null;
}

export interface UseReportAnomaliesResult {
  anomalies: AnomalyEntry[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  acknowledge: (id: string, notes?: string) => Promise<void>;
  dismiss: (id: string, notes?: string) => Promise<void>;
  setNotes: (id: string, notes: string) => Promise<void>;
  /** Dispara a edge function `detect-anomalies` manualmente. */
  runDetection: () => Promise<{ found: number; upserts: number } | null>;
  isRunningDetection: boolean;
}

interface RawRow {
  id: string;
  signal_type: string;
  signal_date: string;
  observed_value: number | string;
  expected_value: number | string;
  expected_lower: number | string;
  expected_upper: number | string;
  z_score: number | string;
  severity: AnomalySeverity;
  direction: AnomalyDirection;
  status: AnomalyStatus;
  notes: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

function toModel(row: RawRow): AnomalyEntry {
  return {
    id: row.id,
    signalType: row.signal_type,
    signalDate: row.signal_date,
    observedValue: Number(row.observed_value),
    expectedValue: Number(row.expected_value),
    expectedLower: Number(row.expected_lower),
    expectedUpper: Number(row.expected_upper),
    zScore: Number(row.z_score),
    severity: row.severity,
    direction: row.direction,
    status: row.status,
    notes: row.notes,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
    detectedAt: row.detected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIsoStart(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return new Date(value).toISOString().slice(0, 10);
}

export function useReportAnomalies(filters: AnomaliesFilters = {}): UseReportAnomaliesResult {
  const [anomalies, setAnomalies] = useState<AnomalyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRunningDetection, setIsRunningDetection] = useState(false);

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        s: filters.statuses ?? [],
        v: filters.severities ?? [],
        d: toIsoStart(filters.startDate),
      }),
    [filters.statuses, filters.severities, filters.startDate],
  );

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      let q = supabase
        .from(TABLE)
        .select(
          "id, signal_type, signal_date, observed_value, expected_value, expected_lower, expected_upper, z_score, severity, direction, status, notes, acknowledged_at, acknowledged_by, detected_at, created_at, updated_at",
        );

      if (filters.statuses && filters.statuses.length > 0) {
        q = q.in("status", filters.statuses);
      }
      if (filters.severities && filters.severities.length > 0) {
        q = q.in("severity", filters.severities);
      }
      const startDate = toIsoStart(filters.startDate);
      if (startDate) {
        q = q.gte("signal_date", startDate);
      }
      q = q.order("signal_date", { ascending: false }).limit(500);

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      setAnomalies((data ?? []).map((r) => toModel(r as RawRow)));
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useReportAnomalies] fetch error", err);
      setError("Não foi possível carregar anomalias.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  // ===== Ações =====

  const updateAnomaly = useCallback(
    async (id: string, patch: Record<string, unknown>): Promise<void> => {
      const prev = anomalies;
      // Optimistic update
      setAnomalies((curr) =>
        curr.map((a) =>
          a.id === id
            ? {
                ...a,
                ...(patch.status ? { status: patch.status as AnomalyStatus } : {}),
                ...(patch.notes !== undefined
                  ? { notes: (patch.notes as string | null) ?? null }
                  : {}),
              }
            : a,
        ),
      );
      try {
        const { error: upErr } = await supabase.from(TABLE).update(patch).eq("id", id);
        if (upErr) throw upErr;
      } catch (err) {
        console.error("[useReportAnomalies] update error", err);
        setAnomalies(prev);
        throw err;
      }
    },
    [anomalies],
  );

  const acknowledge = useCallback(
    async (id: string, notes?: string): Promise<void> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      await updateAnomaly(id, {
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
        ...(notes ? { notes } : {}),
      });
    },
    [updateAnomaly],
  );

  const dismiss = useCallback(
    async (id: string, notes?: string): Promise<void> => {
      await updateAnomaly(id, {
        status: "dismissed",
        ...(notes ? { notes } : {}),
      });
    },
    [updateAnomaly],
  );

  const setNotes = useCallback(
    async (id: string, notes: string): Promise<void> => {
      await updateAnomaly(id, { notes });
    },
    [updateAnomaly],
  );

  const runDetection = useCallback(async (): Promise<{
    found: number;
    upserts: number;
  } | null> => {
    setIsRunningDetection(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("detect-anomalies", {
        body: {},
      });
      if (fnErr) throw fnErr;
      void fetchData();
      const found = Number((data as { anomalies_found?: number } | null)?.anomalies_found ?? 0);
      const upserts = Number((data as { upserts?: number } | null)?.upserts ?? 0);
      return { found, upserts };
    } catch (err) {
      console.error("[useReportAnomalies] runDetection error", err);
      throw err;
    } finally {
      setIsRunningDetection(false);
    }
  }, [fetchData]);

  return {
    anomalies,
    isLoading,
    error,
    lastUpdate,
    refresh: fetchData,
    acknowledge,
    dismiss,
    setNotes,
    runDetection,
    isRunningDetection,
  };
}
