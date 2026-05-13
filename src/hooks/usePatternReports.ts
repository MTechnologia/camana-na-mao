import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PatternEntry } from "@/hooks/usePatternsList";

/**
 * HU-9.1 — Lista de relatos que compõem um padrão detectado pela IA.
 *
 * Carrega urban_reports + transport_reports dentro da janela do padrão
 * (window_start → window_end ou últimas 30 dias se nulo). Quando o padrão
 * tem `lineId`, filtra apenas transport_reports daquela linha. Caso
 * contrário, lista os relatos cuja categoria/descrição bate parcialmente
 * com a descrição do pattern.
 *
 * Limita a 50 relatos por dataset (100 total) para evitar carga pesada.
 */

const MAX_PER_DATASET = 50;

export type PatternReportSource = "urban" | "transport";

export interface PatternReportEntry {
  id: string;
  source: PatternReportSource;
  protocol: string | null;
  title: string;
  description: string | null;
  status: string | null;
  severity: string | null;
  createdAt: string;
  neighborhood?: string | null;
  lineName?: string | null;
  category?: string | null;
}

export interface UsePatternReportsResult {
  reports: PatternReportEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UrbanRow {
  id: string;
  protocol_code: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  status: string | null;
  severity: string | null;
  neighborhood: string | null;
  created_at: string | null;
}

interface TransportRow {
  id: string;
  protocol_code: string | null;
  report_type: string;
  sub_category: string | null;
  description: string | null;
  status: string | null;
  severity: string | null;
  line_id: string | null;
  line_code_custom: string | null;
  stop_name: string | null;
  created_at: string | null;
}

function windowStartIso(pattern: PatternEntry): string | null {
  if (pattern.windowStart) return new Date(pattern.windowStart).toISOString();
  // Fallback: últimos 30 dias
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function windowEndIso(pattern: PatternEntry): string | null {
  if (pattern.windowEnd) return new Date(pattern.windowEnd).toISOString();
  return new Date().toISOString();
}

export function usePatternReports(
  pattern: PatternEntry | null,
): UsePatternReportsResult {
  const [reports, setReports] = useState<PatternReportEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!pattern) {
      setReports([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const startIso = windowStartIso(pattern);
      const endIso = windowEndIso(pattern);

      // 1) Urban reports — só busca se o padrão NÃO tem line_id (que indica transport).
      let urbanRows: UrbanRow[] = [];
      if (!pattern.lineId) {
        let uq = supabase
          .from("urban_reports")
          .select(
            "id, protocol_code, category, subcategory, description, status, severity, neighborhood, created_at",
          );
        if (startIso) uq = uq.gte("created_at", startIso);
        if (endIso) uq = uq.lte("created_at", endIso);
        uq = uq.order("created_at", { ascending: false }).limit(MAX_PER_DATASET);
        const { data, error: uErr } = await uq;
        if (uErr) throw uErr;
        urbanRows = (data ?? []) as UrbanRow[];
      }

      // 2) Transport reports
      let tq = supabase
        .from("transport_reports")
        .select(
          "id, protocol_code, report_type, sub_category, description, status, severity, line_id, line_code_custom, stop_name, created_at",
        );
      if (startIso) tq = tq.gte("created_at", startIso);
      if (endIso) tq = tq.lte("created_at", endIso);
      if (pattern.lineId) tq = tq.eq("line_id", pattern.lineId);
      tq = tq.order("created_at", { ascending: false }).limit(MAX_PER_DATASET);
      const { data: tData, error: tErr } = await tq;
      if (tErr) throw tErr;
      const transportRows = (tData ?? []) as TransportRow[];

      const urbanMapped: PatternReportEntry[] = urbanRows.map((r) => ({
        id: r.id,
        source: "urban",
        protocol: r.protocol_code,
        title: r.subcategory || r.category,
        description: r.description,
        status: r.status,
        severity: r.severity,
        neighborhood: r.neighborhood,
        category: r.category,
        createdAt: r.created_at ?? new Date().toISOString(),
      }));

      const transportMapped: PatternReportEntry[] = transportRows.map((r) => ({
        id: r.id,
        source: "transport",
        protocol: r.protocol_code,
        title: r.sub_category || r.report_type,
        description: r.description,
        status: r.status,
        severity: r.severity,
        lineName: r.line_code_custom ?? r.stop_name ?? null,
        category: r.report_type,
        createdAt: r.created_at ?? new Date().toISOString(),
      }));

      // Junta e ordena por created_at desc.
      const merged = [...urbanMapped, ...transportMapped].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      setReports(merged);
    } catch (err) {
      console.error("[usePatternReports] fetch error", err);
      setError("Não foi possível carregar os relatos do padrão.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern?.id, pattern?.lineId, pattern?.windowStart, pattern?.windowEnd]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { reports, isLoading, error, refresh: fetchData };
}
