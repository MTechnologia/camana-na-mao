import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ReportSource } from "@/contexts/ReportDetailContext";

/**
 * HU-10.3 — Timeline append-only de eventos do ciclo de vida de um relato.
 *
 * Eventos típicos:
 *   - created            (geração do relato — implícito)
 *   - triaged            (primeira definição de prioridade)
 *   - assigned           (responsável alterado)
 *   - prioritized        (prioridade alterada)
 *   - referred           (encaminhado a comissão)
 *   - status_changed     (status do funil alterado)
 *   - note_added         (anotação interna)
 *   - resolved
 *   - reopened
 */

const TABLE = "report_status_events" as const;
const REALTIME_TABLES = [TABLE] as const;

export type ReportEventType =
  | "created"
  | "triaged"
  | "assigned"
  | "prioritized"
  | "referred"
  | "status_changed"
  | "note_added"
  | "resolved"
  | "reopened";

export interface ReportStatusEvent {
  id: string;
  sourceTable: "urban_reports" | "transport_reports";
  reportId: string;
  eventType: ReportEventType;
  eventData: Record<string, unknown>;
  actorId: string | null;
  actorName: string | null;
  occurredAt: string;
}

export interface UseReportStatusEventsResult {
  events: ReportStatusEvent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  append: (eventType: ReportEventType, eventData?: Record<string, unknown>) => Promise<void>;
}

interface RawRow {
  id: string;
  source_table: "urban_reports" | "transport_reports";
  report_id: string;
  event_type: ReportEventType;
  event_data: Record<string, unknown> | null;
  actor_id: string | null;
  occurred_at: string;
  actor?: { full_name: string | null; email: string | null } | null;
}

function sourceToTable(source: ReportSource): "urban_reports" | "transport_reports" {
  return source === "urban" ? "urban_reports" : "transport_reports";
}

export function useReportStatusEvents(
  reportId: string | null,
  source: ReportSource | null,
): UseReportStatusEventsResult {
  const [events, setEvents] = useState<ReportStatusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sourceTable = source ? sourceToTable(source) : null;

  const fetchData = useCallback(async () => {
    if (!reportId || !sourceTable) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from(TABLE)
        .select("id, source_table, report_id, event_type, event_data, actor_id, occurred_at")
        .eq("source_table", sourceTable)
        .eq("report_id", reportId)
        .order("occurred_at", { ascending: true })
        .limit(200);
      if (qErr) throw qErr;
      const rows = (data ?? []) as RawRow[];

      // Busca nomes dos atores em uma segunda query (evita join custoso).
      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[]));
      const nameByUser = new Map<string, string>();
      if (actorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds);
        for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null }>) {
          if (p.full_name) nameByUser.set(p.id, p.full_name);
        }
      }

      setEvents(
        rows.map((r) => ({
          id: r.id,
          sourceTable: r.source_table,
          reportId: r.report_id,
          eventType: r.event_type,
          eventData: r.event_data ?? {},
          actorId: r.actor_id,
          actorName: r.actor_id ? (nameByUser.get(r.actor_id) ?? null) : null,
          occurredAt: r.occurred_at,
        })),
      );
    } catch (err) {
      console.error("[useReportStatusEvents] fetch error", err);
      setError("Não foi possível carregar a timeline.");
    } finally {
      setIsLoading(false);
    }
  }, [reportId, sourceTable]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  const append = useCallback(
    async (eventType: ReportEventType, eventData: Record<string, unknown> = {}): Promise<void> => {
      if (!reportId || !sourceTable) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const { error: insErr } = await supabase.from(TABLE).insert({
        source_table: sourceTable,
        report_id: reportId,
        event_type: eventType,
        event_data: eventData,
        actor_id: userId,
      });
      if (insErr) {
        console.error("[useReportStatusEvents] append error", insErr);
        throw insErr;
      }
      void fetchData();
    },
    [reportId, sourceTable, fetchData],
  );

  return { events, isLoading, error, refresh: fetchData, append };
}
