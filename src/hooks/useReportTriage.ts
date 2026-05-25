import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ReportSource } from "@/contexts/ReportDetailContext";
import type { TriagePriority, TriageStatus } from "@/lib/triage";

/**
 * HU-10.1 — Triagem gerencial de um relato (1:1 com `urban_reports` ou
 * `transport_reports`).
 *
 * Recupera/atualiza prioridade, responsável, status e nota interna. Quando
 * não existe registro ainda, retorna `null` e expõe `upsert()` para criar.
 */

const TABLE = "report_triage" as const;
const REALTIME_TABLES = [TABLE] as const;

export interface TriageRecord {
  id: string;
  sourceTable: "urban_reports" | "transport_reports";
  reportId: string;
  priority: TriagePriority | null;
  /** @deprecated Legado — usuário staff; preferir responsibleCommissionId. */
  assigneeId: string | null;
  responsibleCommissionId: string | null;
  triageStatus: TriageStatus;
  notes: string | null;
  triagedBy: string | null;
  triagedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TriageInput {
  priority?: TriagePriority | null;
  assigneeId?: string | null;
  responsibleCommissionId?: string | null;
  triageStatus?: TriageStatus;
  notes?: string | null;
}

export interface UseReportTriageResult {
  triage: TriageRecord | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upsert: (input: TriageInput) => Promise<TriageRecord | null>;
  advanceStatus: (next: TriageStatus) => Promise<TriageRecord | null>;
}

interface RawRow {
  id: string;
  source_table: "urban_reports" | "transport_reports";
  report_id: string;
  priority: TriagePriority | null;
  assignee_id: string | null;
  responsible_commission_id: string | null;
  triage_status: TriageStatus;
  notes: string | null;
  triaged_by: string | null;
  triaged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

function toModel(row: RawRow): TriageRecord {
  return {
    id: row.id,
    sourceTable: row.source_table,
    reportId: row.report_id,
    priority: row.priority,
    assigneeId: row.assignee_id,
    responsibleCommissionId: row.responsible_commission_id,
    triageStatus: row.triage_status,
    notes: row.notes,
    triagedBy: row.triaged_by,
    triagedAt: row.triaged_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sourceToTable(source: ReportSource): "urban_reports" | "transport_reports" {
  return source === "urban" ? "urban_reports" : "transport_reports";
}

export function useReportTriage(
  reportId: string | null,
  source: ReportSource | null,
): UseReportTriageResult {
  const [triage, setTriage] = useState<TriageRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sourceTable = source ? sourceToTable(source) : null;

  const fetchData = useCallback(async () => {
    if (!reportId || !sourceTable) {
      setTriage(null);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from(TABLE)
        .select(
          "id, source_table, report_id, priority, assignee_id, responsible_commission_id, triage_status, notes, triaged_by, triaged_at, resolved_at, created_at, updated_at",
        )
        .eq("source_table", sourceTable)
        .eq("report_id", reportId)
        .maybeSingle();
      if (qErr) throw qErr;
      setTriage(data ? toModel(data as RawRow) : null);
    } catch (err) {
      console.error("[useReportTriage] fetch error", err);
      setError("Não foi possível carregar a triagem.");
    } finally {
      setIsLoading(false);
    }
  }, [reportId, sourceTable]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  const upsert = useCallback(
    async (input: TriageInput): Promise<TriageRecord | null> => {
      if (!reportId || !sourceTable) return null;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      const payload: Record<string, unknown> = {
        source_table: sourceTable,
        report_id: reportId,
      };
      if (input.priority !== undefined) payload.priority = input.priority;
      if (input.assigneeId !== undefined) payload.assignee_id = input.assigneeId;
      if (input.responsibleCommissionId !== undefined) {
        payload.responsible_commission_id = input.responsibleCommissionId;
        if (input.responsibleCommissionId !== null) {
          payload.assignee_id = null;
        }
      }
      if (input.triageStatus !== undefined) payload.triage_status = input.triageStatus;
      if (input.notes !== undefined) payload.notes = input.notes;

      // Quando o registro é criado pela primeira vez, marca triaged_by/triaged_at.
      if (!triage) {
        payload.triaged_by = userId;
        payload.triaged_at = new Date().toISOString();
        if (input.triageStatus === undefined && input.priority) {
          payload.triage_status = "triaged";
        }
      } else if (input.priority && !triage.priority) {
        // Primeira definição de prioridade: registra triaged_at.
        payload.triaged_by = userId;
        payload.triaged_at = new Date().toISOString();
      }

      const { data, error: upErr } = await supabase
        .from(TABLE)
        .upsert(payload, { onConflict: "source_table,report_id" })
        .select()
        .single();
      if (upErr) {
        console.error("[useReportTriage] upsert error", upErr);
        throw upErr;
      }
      const model = toModel(data as RawRow);
      setTriage(model);

      // Append eventos descritivos na timeline. Falha é não-fatal.
      try {
        const events: Array<{ type: string; data: Record<string, unknown> }> = [];
        if (!triage) {
          events.push({ type: "triaged", data: { newRecord: true } });
        }
        if (input.priority !== undefined && input.priority !== triage?.priority) {
          events.push({
            type: "prioritized",
            data: { from: triage?.priority ?? null, to: input.priority },
          });
        }
        if (
          input.responsibleCommissionId !== undefined
          && input.responsibleCommissionId !== triage?.responsibleCommissionId
        ) {
          events.push({
            type: "assigned",
            data: {
              from: triage?.responsibleCommissionId ?? null,
              to: input.responsibleCommissionId,
            },
          });
        }
        if (
          input.triageStatus !== undefined
          && input.triageStatus !== triage?.triageStatus
        ) {
          events.push({
            type: "status_changed",
            data: { from: triage?.triageStatus ?? null, to: input.triageStatus },
          });
        }
        if (events.length > 0) {
          await supabase.from("report_status_events").insert(
            events.map((e) => ({
              source_table: sourceTable,
              report_id: reportId,
              event_type: e.type,
              event_data: e.data,
              actor_id: userId,
            })),
          );
        }
      } catch (evErr) {
        console.warn("[useReportTriage] failed to append events", evErr);
      }

      return model;
    },
    [reportId, sourceTable, triage],
  );

  const advanceStatus = useCallback(
    async (next: TriageStatus): Promise<TriageRecord | null> => {
      return upsert({ triageStatus: next });
    },
    [upsert],
  );

  return useMemo(
    () => ({
      triage,
      isLoading,
      error,
      refresh: fetchData,
      upsert,
      advanceStatus,
    }),
    [triage, isLoading, error, fetchData, upsert, advanceStatus],
  );
}

/**
 * Hook complementar: lista de usuários disponíveis para atribuição
 * (admin/gestor/assessor). Usa RPC `list_triage_assignees`.
 */

export interface TriageAssignee {
  userId: string;
  email: string;
  fullName: string;
  role: "admin" | "gestor" | "assessor";
}

export function useTriageAssignees(): {
  assignees: TriageAssignee[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [assignees, setAssignees] = useState<TriageAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc("list_triage_assignees");
      if (rpcErr) throw rpcErr;
      const rows = (data ?? []) as Array<{
        user_id: string;
        email: string;
        full_name: string;
        role: string;
      }>;
      setAssignees(
        rows.map((r) => ({
          userId: r.user_id,
          email: r.email,
          fullName: r.full_name,
          role: r.role as TriageAssignee["role"],
        })),
      );
    } catch (err) {
      console.error("[useTriageAssignees] error", err);
      setError("Não foi possível carregar responsáveis.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { assignees, isLoading, error, refresh: fetchData };
}
