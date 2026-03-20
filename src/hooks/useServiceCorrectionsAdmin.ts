import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { correctionFieldLabel } from "@/lib/serviceCorrectionFields";

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
};

export function useServiceCorrectionsAdmin() {
  const [rows, setRows] = useState<ServiceCorrectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("service_corrections")
        .select(
          `
          *,
          public_services ( id, name, address, district, phone, service_type )
        `,
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }

      const { data, error } = await q;
      if (error) throw error;

      const base = (data ?? []) as ServiceCorrectionRow[];
      const userIds = [...new Set(base.map((r) => r.user_id))];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      }

      const enriched: ServiceCorrectionRow[] = base.map((r) => ({
        ...r,
        submitter: {
          id: r.user_id,
          full_name: profileMap.get(r.user_id) ?? "(sem nome no perfil)",
        },
      }));

      setRows(enriched);
    } catch (e) {
      console.error("[useServiceCorrectionsAdmin]", e);
      setRows([]);
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
    return (
      r.suggested_value.toLowerCase().includes(t) ||
      (r.current_value ?? "").toLowerCase().includes(t) ||
      correctionFieldLabel(r.field_name).toLowerCase().includes(t) ||
      (svc?.name ?? "").toLowerCase().includes(t) ||
      (r.submitter?.full_name ?? "").toLowerCase().includes(t)
    );
  });

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return {
    rows: filtered,
    loading,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    refetch: fetchRows,
    updateModeration,
  };
}
