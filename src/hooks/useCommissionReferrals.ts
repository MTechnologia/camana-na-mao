import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ReportSource } from "@/contexts/ReportDetailContext";

/**
 * HU-10.2 — Encaminhamentos de relatos para comissões temáticas.
 *
 * Quando `reportId` é fornecido, retorna apenas os encaminhamentos desse
 * relato (uso no ReportDetailSheet). Quando omitido, retorna todos (uso no
 * painel da comissão).
 */

const TABLE = "report_commission_referrals" as const;
const REALTIME_TABLES = [TABLE] as const;
const MIN_JUSTIFICATION = 20;

export type ReferralStatus = "pending" | "accepted" | "rejected" | "processed";

export interface CommissionReferral {
  id: string;
  sourceTable: "urban_reports" | "transport_reports";
  reportId: string;
  commissionId: string;
  commissionName: string | null;
  commissionCode: string | null;
  justification: string;
  status: ReferralStatus;
  commissionNotes: string | null;
  referredBy: string;
  referredAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitReferralInput {
  commissionId: string;
  justification: string;
}

export interface UseCommissionReferralsResult {
  referrals: CommissionReferral[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submit: (input: SubmitReferralInput) => Promise<CommissionReferral>;
  updateStatus: (
    id: string,
    status: ReferralStatus,
    notes?: string,
  ) => Promise<void>;
}

interface RawRow {
  id: string;
  source_table: "urban_reports" | "transport_reports";
  report_id: string;
  commission_id: string;
  justification: string;
  status: ReferralStatus;
  commission_notes: string | null;
  referred_by: string;
  referred_at: string;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
  legislative_commissions?: {
    name: string | null;
    code: string | null;
  } | null;
}

function toModel(row: RawRow): CommissionReferral {
  return {
    id: row.id,
    sourceTable: row.source_table,
    reportId: row.report_id,
    commissionId: row.commission_id,
    commissionName: row.legislative_commissions?.name ?? null,
    commissionCode: row.legislative_commissions?.code ?? null,
    justification: row.justification,
    status: row.status,
    commissionNotes: row.commission_notes,
    referredBy: row.referred_by,
    referredAt: row.referred_at,
    respondedAt: row.responded_at,
    respondedBy: row.responded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sourceToTable(
  source: ReportSource,
): "urban_reports" | "transport_reports" {
  return source === "urban" ? "urban_reports" : "transport_reports";
}

export class JustificationTooShortError extends Error {
  constructor() {
    super(
      `A justificativa precisa ter pelo menos ${MIN_JUSTIFICATION} caracteres.`,
    );
    this.name = "JustificationTooShortError";
  }
}

export function useCommissionReferrals(
  reportId: string | null,
  source: ReportSource | null,
): UseCommissionReferralsResult {
  const [referrals, setReferrals] = useState<CommissionReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sourceTable = source ? sourceToTable(source) : null;

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      let q = supabase
        .from(TABLE)
        .select(
          "id, source_table, report_id, commission_id, justification, status, commission_notes, referred_by, referred_at, responded_at, responded_by, created_at, updated_at, legislative_commissions(name, code)",
        )
        .order("referred_at", { ascending: false });

      if (reportId && sourceTable) {
        q = q.eq("source_table", sourceTable).eq("report_id", reportId);
      }

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      setReferrals((data ?? []).map((r) => toModel(r as RawRow)));
    } catch (err) {
      console.error("[useCommissionReferrals] fetch error", err);
      setError("Não foi possível carregar os encaminhamentos.");
    } finally {
      setIsLoading(false);
    }
  }, [reportId, sourceTable]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  const submit = useCallback(
    async (input: SubmitReferralInput): Promise<CommissionReferral> => {
      if (!reportId || !sourceTable) {
        throw new Error("reportId e source são obrigatórios.");
      }
      const justification = input.justification.trim();
      if (justification.length < MIN_JUSTIFICATION) {
        throw new JustificationTooShortError();
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Sessão expirada — faça login novamente.");

      const { data, error: insErr } = await supabase
        .from(TABLE)
        .insert({
          source_table: sourceTable,
          report_id: reportId,
          commission_id: input.commissionId,
          justification,
          referred_by: userId,
        })
        .select(
          "id, source_table, report_id, commission_id, justification, status, commission_notes, referred_by, referred_at, responded_at, responded_by, created_at, updated_at, legislative_commissions(name, code)",
        )
        .single();
      if (insErr) {
        console.error("[useCommissionReferrals] submit error", insErr);
        throw insErr;
      }

      // Append evento na timeline.
      try {
        await supabase.from("report_status_events").insert({
          source_table: sourceTable,
          report_id: reportId,
          event_type: "referred",
          event_data: {
            commission_id: input.commissionId,
            justification,
          },
          actor_id: userId,
        });
      } catch (evErr) {
        console.warn("[useCommissionReferrals] failed to append event", evErr);
      }

      const model = toModel(data as RawRow);
      setReferrals((curr) => [model, ...curr]);
      return model;
    },
    [reportId, sourceTable],
  );

  const updateStatus = useCallback(
    async (id: string, status: ReferralStatus, notes?: string): Promise<void> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const patch: Record<string, unknown> = { status, responded_by: userId };
      if (notes !== undefined) patch.commission_notes = notes;

      // Optimistic update.
      const prev = referrals;
      setReferrals((curr) =>
        curr.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                ...(notes !== undefined ? { commissionNotes: notes } : {}),
              }
            : r,
        ),
      );
      try {
        const { error: upErr } = await supabase
          .from(TABLE)
          .update(patch)
          .eq("id", id);
        if (upErr) throw upErr;
      } catch (err) {
        console.error("[useCommissionReferrals] updateStatus error", err);
        setReferrals(prev);
        throw err;
      }
    },
    [referrals],
  );

  return useMemo(
    () => ({
      referrals,
      isLoading,
      error,
      refresh: fetchData,
      submit,
      updateStatus,
    }),
    [referrals, isLoading, error, fetchData, submit, updateStatus],
  );
}

export const COMMISSION_REFERRAL_MIN_JUSTIFICATION = MIN_JUSTIFICATION;
