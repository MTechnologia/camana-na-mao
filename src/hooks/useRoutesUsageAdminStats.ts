import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ROUTE_MATRIX_COST_PER_ELEMENT_BRL = 0.005;

interface RoutesUsageAdminStats {
  loading: boolean;
  events30d: number;
  elements30d: number;
  destinations30d: number;
  chunkRequests30d: number;
  cacheHitRate30d: number;
  estimatedCost30dBrl: number;
}

export function useRoutesUsageAdminStats(): RoutesUsageAdminStats {
  const [stats, setStats] = useState<RoutesUsageAdminStats>({
    loading: true,
    events30d: 0,
    elements30d: 0,
    destinations30d: 0,
    chunkRequests30d: 0,
    cacheHitRate30d: 0,
    estimatedCost30dBrl: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("routes_usage_metrics")
        .select("cache_hit, elements_count, destinations_count, chunk_requests")
        .eq("context", "nearby_services")
        .gte("created_at", fromDate)
        .limit(10000);

      if (error) {
        console.error("[routes_usage_admin_stats] error fetching metrics:", error);
        setStats((prev) => ({ ...prev, loading: false }));
        return;
      }

      const rows = data ?? [];
      const events = rows.length;
      const cacheHitEvents = rows.reduce((acc, row) => acc + (row.cache_hit ? 1 : 0), 0);
      const elements = rows.reduce((acc, row) => acc + (row.elements_count ?? 0), 0);
      const destinations = rows.reduce((acc, row) => acc + (row.destinations_count ?? 0), 0);
      const chunkRequests = rows.reduce((acc, row) => acc + (row.chunk_requests ?? 0), 0);
      const cacheHitRate = events > 0 ? (cacheHitEvents / events) * 100 : 0;

      setStats({
        loading: false,
        events30d: events,
        elements30d: elements,
        destinations30d: destinations,
        chunkRequests30d: chunkRequests,
        cacheHitRate30d: Number(cacheHitRate.toFixed(1)),
        estimatedCost30dBrl: Number((elements * ROUTE_MATRIX_COST_PER_ELEMENT_BRL).toFixed(2)),
      });
    };

    void fetchStats();
  }, []);

  return stats;
}
