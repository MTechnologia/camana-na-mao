import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ExportDataset } from "@/lib/exportFields";
import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * HU-7.4 + HU-7.5 — Hook para gerenciar export_jobs server-side.
 *
 * - Lista jobs do usuário (últimos 50) com refresh realtime.
 * - `create(config)` insere um job pendente e invoca a edge function
 *   `process-export-job` (fire-and-forget). O status é refletido pelo
 *   realtime quando a função atualiza a linha.
 * - `cancel(id)` marca como cancelled (edge function deve checar status).
 * - `remove(id)` exclui o job (incluindo o arquivo do Storage).
 * - `getSignedUrl(job)` gera URL signed para download (válida ~7 dias).
 */

const TABLE = "export_jobs" as const;
const REALTIME_TABLES = [TABLE] as const;
const STORAGE_BUCKET = "export-files" as const;
const SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const APP_ORIGIN_FILTER_KEY = "__app_origin";

function withAppOrigin<T extends Record<string, unknown>>(filters: T): T {
  if (typeof window === "undefined" || !window.location?.origin) return filters;
  if (typeof filters[APP_ORIGIN_FILTER_KEY] === "string") return filters;
  return { ...filters, [APP_ORIGIN_FILTER_KEY]: window.location.origin } as T;
}

export type ExportJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface ExportJob {
  id: string;
  userId: string;
  dataset: ExportDataset;
  format: "csv" | "xlsx";
  fields: string[];
  orderBy: { fieldId: string; direction: "asc" | "desc" };
  filters: {
    startDate?: string | null;
    endDate?: string | null;
    categories?: string[];
    regions?: string[];
    zones?: ZonaVolumeOuDesconhecida[];
  };
  includeSummary: boolean;
  source: "manual" | "scheduled";
  scheduledExportId: string | null;
  status: ExportJobStatus;
  rowCount: number | null;
  storagePath: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateExportJobInput {
  dataset: ExportDataset;
  format: "csv" | "xlsx";
  fieldIds: string[];
  orderBy: { fieldId: string; direction: "asc" | "desc" };
  filters?: ExportJob["filters"];
  includeSummary?: boolean;
}

export interface UseExportJobsResult {
  jobs: ExportJob[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: CreateExportJobInput) => Promise<ExportJob | null>;
  cancel: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getSignedUrl: (job: ExportJob) => Promise<string | null>;
}

interface RawRow {
  id: string;
  user_id: string;
  dataset: string;
  format: string;
  fields: unknown;
  order_by: unknown;
  filters: unknown;
  include_summary: boolean;
  source: string;
  scheduled_export_id: string | null;
  status: string;
  row_count: number | null;
  storage_path: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function toModel(row: RawRow): ExportJob {
  return {
    id: row.id,
    userId: row.user_id,
    dataset: row.dataset as ExportDataset,
    format: row.format as "csv" | "xlsx",
    fields: (row.fields as string[]) ?? [],
    orderBy: (row.order_by as { fieldId: string; direction: "asc" | "desc" }) ?? {
      fieldId: "created_at",
      direction: "desc",
    },
    filters: (row.filters as ExportJob["filters"]) ?? {},
    includeSummary: row.include_summary,
    source: row.source as "manual" | "scheduled",
    scheduledExportId: row.scheduled_export_id,
    status: row.status as ExportJobStatus,
    rowCount: row.row_count,
    storagePath: row.storage_path,
    error: row.error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function useExportJobs(): UseExportJobsResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setJobs([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const { data, error: selectError } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (selectError) throw selectError;
      setJobs((data ?? []).map((r) => toModel(r as RawRow)));
    } catch (err) {
      console.error("[useExportJobs] fetch error", err);
      setError("Não foi possível carregar as exportações.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Realtime — refresh quando qualquer linha de export_jobs muda. A RLS
  // garante que só veremos jobs do próprio user.
  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  const create = useCallback(
    async (input: CreateExportJobInput): Promise<ExportJob | null> => {
      if (!userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from(TABLE)
          .insert({
            user_id: userId,
            dataset: input.dataset,
            format: input.format,
            fields: input.fieldIds,
            order_by: input.orderBy,
            filters: withAppOrigin((input.filters ?? {}) as Record<string, unknown>),
            include_summary: input.includeSummary ?? false,
            source: "manual",
            status: "pending",
          })
          .select("*")
          .single();
        if (insertError) throw insertError;
        const job = toModel(data as RawRow);
        setJobs((prev) => [job, ...prev]);

        // Dispara a edge function (fire-and-forget). A UI vai refletir via realtime.
        try {
          await supabase.functions.invoke("process-export-job", {
            body: { jobId: job.id },
          });
        } catch (invokeErr) {
          console.warn("[useExportJobs] falha ao invocar process-export-job", invokeErr);
          // O job permanece pending; um retry manual ou cron pode reprocessar.
        }
        return job;
      } catch (err) {
        console.error("[useExportJobs] create error", err);
        setError("Não foi possível enfileirar a exportação.");
        return null;
      }
    },
    [userId],
  );

  const cancel = useCallback(
    async (id: string) => {
      if (!userId) return;
      const prev = jobs;
      setJobs((p) => p.map((j) => (j.id === id ? { ...j, status: "cancelled" } : j)));
      try {
        const { error: updErr } = await supabase
          .from(TABLE)
          .update({ status: "cancelled", completed_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId)
          .in("status", ["pending", "running"]);
        if (updErr) throw updErr;
      } catch (err) {
        console.error("[useExportJobs] cancel error", err);
        setError("Não foi possível cancelar a exportação.");
        setJobs(prev);
      }
    },
    [userId, jobs],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return;
      const target = jobs.find((j) => j.id === id);
      const prev = jobs;
      setJobs((p) => p.filter((j) => j.id !== id));
      try {
        // Apaga o arquivo do storage se houver (best-effort).
        if (target?.storagePath) {
          await supabase.storage.from(STORAGE_BUCKET).remove([target.storagePath]);
        }
        const { error: delErr } = await supabase
          .from(TABLE)
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (delErr) throw delErr;
      } catch (err) {
        console.error("[useExportJobs] remove error", err);
        setError("Não foi possível excluir a exportação.");
        setJobs(prev);
      }
    },
    [userId, jobs],
  );

  const getSignedUrl = useCallback(async (job: ExportJob): Promise<string | null> => {
    if (!job.storagePath) return null;
    try {
      const { data, error: urlErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(job.storagePath, SIGNED_URL_EXPIRES_SECONDS);
      if (urlErr) throw urlErr;
      return data?.signedUrl ?? null;
    } catch (err) {
      console.error("[useExportJobs] signed URL error", err);
      return null;
    }
  }, []);

  return useMemo(
    () => ({ jobs, isLoading, error, refresh: fetchData, create, cancel, remove, getSignedUrl }),
    [jobs, isLoading, error, fetchData, create, cancel, remove, getSignedUrl],
  );
}
