import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type { VisitHistoryUiStatus } from "@/lib/visitHistoryStatus";
export { getVisitHistoryUiStatus } from "@/lib/visitHistoryStatus";

export interface VisitHistoryService {
  id: string;
  name: string;
  service_type: string;
  address: string | null;
  district: string | null;
}

export interface VisitHistoryRow {
  id: string;
  created_at: string;
  departed_at: string | null;
  expires_at: string;
  status: string;
  visited_at: string;
  service: VisitHistoryService | null;
}

export function useVisitHistory() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    if (!user?.id) {
      setVisits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: qErr } = await supabase
        .from("service_visits")
        .select(
          `
          id,
          created_at,
          departed_at,
          expires_at,
          status,
          visited_at,
          service:public_services (
            id,
            name,
            service_type,
            address,
            district
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;

      const rows = (data ?? []).map((row) => {
        const svc = row.service as VisitHistoryService | VisitHistoryService[] | null;
        const service = Array.isArray(svc) ? svc[0] ?? null : svc;
        return {
          id: row.id as string,
          created_at: row.created_at as string,
          departed_at: (row.departed_at as string | null) ?? null,
          expires_at: row.expires_at as string,
          status: row.status as string,
          visited_at: row.visited_at as string,
          service,
        };
      });

      setVisits(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar visitas";
      setError(msg);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchVisits();
  }, [fetchVisits]);

  const deleteVisits = useCallback(
    async (visitIds: string[]) => {
      if (!user?.id || visitIds.length === 0) return 0;

      try {
        const { error: delErr } = await supabase
          .from("service_visits")
          .delete()
          .in("id", visitIds)
          .eq("user_id", user.id);

        if (delErr) throw delErr;

        await fetchVisits();
        return visitIds.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao excluir visitas";
        setError(msg);
        return 0;
      }
    },
    [user?.id, fetchVisits],
  );

  const deleteAllVisits = useCallback(async () => {
    if (!user?.id) return 0;
    const count = visits.length;
    if (count === 0) return 0;

    try {
      const { error: delErr } = await supabase
        .from("service_visits")
        .delete()
        .eq("user_id", user.id);

      if (delErr) throw delErr;

      await fetchVisits();
      return count;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao limpar visitas";
      setError(msg);
      return 0;
    }
  }, [user?.id, visits.length, fetchVisits]);

  return { visits, loading, error, refetch: fetchVisits, deleteVisits, deleteAllVisits };
}
