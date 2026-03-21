import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  correctionDisplayLabel,
  correctionTypeLabel,
  isServiceCorrectionSlaOverdue,
  serviceCorrectionSlaDeadline,
  SERVICE_CORRECTION_REVIEW_SLA_HOURS,
} from "@/lib/serviceCorrectionFields";

export type ServiceCorrectionRow = Database["public"]["Tables"]["service_corrections"]["Row"] & {
  public_services?: {
    id: string;
    name: string;
    address: string;
    district: string;
    phone: string | null;
    service_type: string;
  } | null;
  submitter?: { id: string; full_name: string } | null;
  reviewer?: { id: string; full_name: string } | null;
};

export type ServiceCorrectionStatusCounts = {
  pending: number;
  approved: number;
  rejected: number;
  applied: number;
  all: number;
};

const emptyCounts: ServiceCorrectionStatusCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
  applied: 0,
  all: 0,
};

async function fetchStatusCounts(): Promise<ServiceCorrectionStatusCounts> {
  const slaCutoff = new Date(Date.now() - SLA_MS).toISOString();
  const [pending, pendingOverSla, approved, rejected, applied, all] = await Promise.all([
    supabase.from("service_corrections").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("service_corrections")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", slaCutoff),
    supabase.from("service_corrections").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("service_corrections").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("service_corrections").select("*", { count: "exact", head: true }).eq("status", "applied"),
    supabase.from("service_corrections").select("*", { count: "exact", head: true }),
  ]);
  return {
    pending: pending.count ?? 0,
    pendingOverSla: pendingOverSla.count ?? 0,
    approved: approved.count ?? 0,
    rejected: rejected.count ?? 0,
    applied: applied.count ?? 0,
    all: all.count ?? 0,
  };
}

export function useServiceCorrectionsAdmin() {
  const [rows, setRows] = useState<ServiceCorrectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusCounts, setStatusCounts] = useState<ServiceCorrectionStatusCounts>(emptyCounts);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let listQuery = supabase
        .from("service_corrections")
        .select(
          `
          *,
          public_services ( id, name, address, district, phone, service_type )
        `,
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        listQuery = listQuery.eq("status", statusFilter);
      }

      const [counts, listResult] = await Promise.all([fetchStatusCounts(), listQuery]);

      setStatusCounts(counts);

      const { data, error } = listResult;
      if (error) throw error;

      const base = (data ?? []) as ServiceCorrectionRow[];
      const submitterIds = [...new Set(base.map((r) => r.user_id))];
      const reviewerIds = [
        ...new Set(base.map((r) => r.reviewed_by).filter((id): id is string => !!id)),
      ];

      let profileMap = new Map<string, string>();
      const allProfileIds = [...new Set([...submitterIds, ...reviewerIds])];
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", allProfileIds);
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      }

      const enriched: ServiceCorrectionRow[] = base.map((r) => ({
        ...r,
        submitter: {
          id: r.user_id,
          full_name: profileMap.get(r.user_id) ?? "(sem nome no perfil)",
        },
        reviewer: r.reviewed_by
          ? {
              id: r.reviewed_by,
              full_name: profileMap.get(r.reviewed_by) ?? "(moderador)",
            }
          : null,
      }));

      const ordered =
        statusFilter === "pending"
          ? [...enriched].sort((a, b) => {
              const aOver = isServiceCorrectionSlaOverdue(a.created_at, a.status);
              const bOver = isServiceCorrectionSlaOverdue(b.created_at, b.status);
              if (aOver !== bOver) return aOver ? -1 : 1;
              if (!a.created_at || !b.created_at) return 0;
              if (aOver) {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              }
              return (
                serviceCorrectionSlaDeadline(a.created_at).getTime() -
                serviceCorrectionSlaDeadline(b.created_at).getTime()
              );
            })
          : enriched;

      setRows(ordered);
    } catch (e) {
      console.error("[useServiceCorrectionsAdmin]", e);
      setRows([]);
      setStatusCounts(emptyCounts);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const updateModeration = async (
    id: string,
    payload: {
      status: "approved" | "rejected" | "applied";
      staff_notes?: string | null;
    },
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão inválida");

    const { error } = await supabase
      .from("service_corrections")
      .update({
        status: payload.status,
        staff_notes: payload.staff_notes?.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", id);

    if (error) throw error;
    await fetchRows();
  };

  const filtered = rows.filter((r) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    const svc = r.public_services;
    const typeLbl = correctionTypeLabel(r.correction_type).toLowerCase();
    return (
      r.suggested_value.toLowerCase().includes(t) ||
      (r.current_value ?? "").toLowerCase().includes(t) ||
      typeLbl.includes(t) ||
      correctionDisplayLabel(r.correction_type, r.field_name).toLowerCase().includes(t) ||
      (svc?.name ?? "").toLowerCase().includes(t) ||
      (r.submitter?.full_name ?? "").toLowerCase().includes(t) ||
      (r.reviewer?.full_name ?? "").toLowerCase().includes(t)
    );
  });

  return {
    rows: filtered,
    loading,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    refetch: fetchRows,
    updateModeration,
    statusCounts,
  };
}
