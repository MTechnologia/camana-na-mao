import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ExportDataset } from "@/lib/exportFields";
import type { RelativePeriodKind } from "@/lib/relativePeriod";

/**
 * HU-7.4 — CRUD dos agendamentos periódicos (scheduled_exports).
 *
 * Mantém lista do usuário em memória. Cria/atualiza/remove com persistência
 * otimista. Realtime para refletir mudanças vindas do cron (last_run_at).
 */

const TABLE = "scheduled_exports" as const;

export type Recurrence = "daily" | "weekly" | "monthly";

export type PeriodKind = "relative" | "fixed";

export interface ScheduledExport {
  id: string;
  userId: string;
  name: string;
  dataset: ExportDataset;
  format: "csv" | "xlsx";
  fields: string[];
  orderBy: { fieldId: string; direction: "asc" | "desc" };
  filters: Record<string, unknown>;
  includeSummary: boolean;
  recurrence: Recurrence;
  runHour: number;
  runMinute: number;
  weekday: number | null;
  monthday: number | null;
  // HU-8.1
  periodKind: PeriodKind;
  periodRelative: RelativePeriodKind | null;
  notifyInApp: boolean;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledExportInput {
  name: string;
  dataset: ExportDataset;
  format: "csv" | "xlsx";
  fieldIds: string[];
  orderBy: { fieldId: string; direction: "asc" | "desc" };
  filters?: Record<string, unknown>;
  includeSummary?: boolean;
  recurrence: Recurrence;
  runHour: number;
  runMinute: number;
  weekday?: number;
  monthday?: number;
  // HU-8.1
  periodKind?: PeriodKind;
  periodRelative?: RelativePeriodKind;
  notifyInApp?: boolean;
}

export interface UpdateScheduledExportInput {
  name?: string;
  recurrence?: Recurrence;
  runHour?: number;
  runMinute?: number;
  weekday?: number | null;
  monthday?: number | null;
  enabled?: boolean;
  fields?: string[];
  orderBy?: { fieldId: string; direction: "asc" | "desc" };
  filters?: Record<string, unknown>;
  includeSummary?: boolean;
  // HU-8.1
  periodKind?: PeriodKind;
  periodRelative?: RelativePeriodKind | null;
  notifyInApp?: boolean;
}

export interface UseScheduledExportsResult {
  schedules: ScheduledExport[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CreateScheduledExportInput) => Promise<ScheduledExport | null>;
  update: (id: string, patch: UpdateScheduledExportInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
}

interface RawRow {
  id: string;
  user_id: string;
  name: string;
  dataset: string;
  format: string;
  fields: unknown;
  order_by: unknown;
  filters: unknown;
  include_summary: boolean;
  recurrence: string;
  run_hour: number;
  run_minute: number;
  weekday: number | null;
  monthday: number | null;
  period_kind: string | null;
  period_relative: string | null;
  notify_in_app: boolean | null;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

function toModel(row: RawRow): ScheduledExport {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    dataset: row.dataset as ExportDataset,
    format: row.format as "csv" | "xlsx",
    fields: (row.fields as string[]) ?? [],
    orderBy:
      (row.order_by as { fieldId: string; direction: "asc" | "desc" }) ?? {
        fieldId: "created_at",
        direction: "desc",
      },
    filters: (row.filters as Record<string, unknown>) ?? {},
    includeSummary: row.include_summary,
    recurrence: row.recurrence as Recurrence,
    runHour: row.run_hour,
    runMinute: row.run_minute,
    weekday: row.weekday,
    monthday: row.monthday,
    periodKind: ((row.period_kind ?? "relative") as PeriodKind),
    periodRelative: (row.period_relative as RelativePeriodKind | null) ?? null,
    notifyInApp: row.notify_in_app ?? true,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useScheduledExports(): UseScheduledExportsResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [schedules, setSchedules] = useState<ScheduledExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const { data, error: selectError } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (selectError) throw selectError;
      setSchedules((data ?? []).map((r) => toModel(r as RawRow)));
    } catch (err) {
      console.error("[useScheduledExports] fetch error", err);
      setError("Não foi possível carregar os agendamentos.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh([TABLE], fetchData);

  const create = useCallback(
    async (input: CreateScheduledExportInput): Promise<ScheduledExport | null> => {
      if (!userId) return null;
      try {
        const { data, error: insErr } = await supabase
          .from(TABLE)
          .insert({
            user_id: userId,
            name: input.name.trim(),
            dataset: input.dataset,
            format: input.format,
            fields: input.fieldIds,
            order_by: input.orderBy,
            filters: input.filters ?? {},
            include_summary: input.includeSummary ?? false,
            recurrence: input.recurrence,
            run_hour: input.runHour,
            run_minute: input.runMinute,
            weekday: input.weekday ?? null,
            monthday: input.monthday ?? null,
            // HU-8.1 — defaults sensatos quando o caller não especifica.
            period_kind: input.periodKind ?? "relative",
            period_relative:
              input.periodKind === "fixed" ? null : (input.periodRelative ?? "last_7d"),
            notify_in_app: input.notifyInApp ?? true,
            // next_run_at é calculado pelo trigger auto_set_scheduled_export_next_run.
            // Passa um placeholder em ISO pra satisfazer a constraint NOT NULL.
            next_run_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (insErr) throw insErr;
        const schedule = toModel(data as RawRow);
        setSchedules((prev) =>
          [...prev, schedule].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        );
        return schedule;
      } catch (err) {
        console.error("[useScheduledExports] create error", err);
        setError("Não foi possível salvar o agendamento.");
        return null;
      }
    },
    [userId],
  );

  const update = useCallback(
    async (id: string, patch: UpdateScheduledExportInput) => {
      if (!userId) return;
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name.trim();
      if (patch.recurrence !== undefined) dbPatch.recurrence = patch.recurrence;
      if (patch.runHour !== undefined) dbPatch.run_hour = patch.runHour;
      if (patch.runMinute !== undefined) dbPatch.run_minute = patch.runMinute;
      if (patch.weekday !== undefined) dbPatch.weekday = patch.weekday;
      if (patch.monthday !== undefined) dbPatch.monthday = patch.monthday;
      if (patch.enabled !== undefined) dbPatch.enabled = patch.enabled;
      if (patch.fields !== undefined) dbPatch.fields = patch.fields;
      if (patch.orderBy !== undefined) dbPatch.order_by = patch.orderBy;
      if (patch.filters !== undefined) dbPatch.filters = patch.filters;
      if (patch.includeSummary !== undefined) dbPatch.include_summary = patch.includeSummary;
      if (patch.periodKind !== undefined) dbPatch.period_kind = patch.periodKind;
      if (patch.periodRelative !== undefined) dbPatch.period_relative = patch.periodRelative;
      if (patch.notifyInApp !== undefined) dbPatch.notify_in_app = patch.notifyInApp;
      if (Object.keys(dbPatch).length === 0) return;

      const prev = schedules;
      setSchedules((p) =>
        p.map((s) =>
          s.id === id
            ? {
                ...s,
                ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
                ...(patch.recurrence !== undefined ? { recurrence: patch.recurrence } : {}),
                ...(patch.runHour !== undefined ? { runHour: patch.runHour } : {}),
                ...(patch.runMinute !== undefined ? { runMinute: patch.runMinute } : {}),
                ...(patch.weekday !== undefined ? { weekday: patch.weekday } : {}),
                ...(patch.monthday !== undefined ? { monthday: patch.monthday } : {}),
                ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
                ...(patch.fields !== undefined ? { fields: patch.fields } : {}),
                ...(patch.orderBy !== undefined ? { orderBy: patch.orderBy } : {}),
                ...(patch.filters !== undefined ? { filters: patch.filters } : {}),
                ...(patch.includeSummary !== undefined
                  ? { includeSummary: patch.includeSummary }
                  : {}),
                ...(patch.periodKind !== undefined ? { periodKind: patch.periodKind } : {}),
                ...(patch.periodRelative !== undefined
                  ? { periodRelative: patch.periodRelative }
                  : {}),
                ...(patch.notifyInApp !== undefined ? { notifyInApp: patch.notifyInApp } : {}),
              }
            : s,
        ),
      );

      try {
        const { error: updErr } = await supabase
          .from(TABLE)
          .update(dbPatch)
          .eq("id", id)
          .eq("user_id", userId);
        if (updErr) throw updErr;
      } catch (err) {
        console.error("[useScheduledExports] update error", err);
        setError("Não foi possível atualizar o agendamento.");
        setSchedules(prev);
      }
    },
    [userId, schedules],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return;
      const prev = schedules;
      setSchedules((p) => p.filter((s) => s.id !== id));
      try {
        const { error: delErr } = await supabase
          .from(TABLE)
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (delErr) throw delErr;
      } catch (err) {
        console.error("[useScheduledExports] remove error", err);
        setError("Não foi possível excluir o agendamento.");
        setSchedules(prev);
      }
    },
    [userId, schedules],
  );

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      await update(id, { enabled });
    },
    [update],
  );

  return useMemo(
    () => ({ schedules, isLoading, error, refresh: fetchData, create, update, remove, toggle }),
    [schedules, isLoading, error, fetchData, create, update, remove, toggle],
  );
}
