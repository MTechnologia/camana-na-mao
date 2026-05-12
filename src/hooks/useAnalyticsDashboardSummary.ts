import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DashboardKpiSlice = {
  current: number;
  previous: number;
  trendPct: number | null;
};

export type AnalyticsDashboardSummary = {
  range: { start: string; end: string };
  kpis: {
    totalReports: DashboardKpiSlice;
    positiveRate: DashboardKpiSlice;
    criticalIssues: DashboardKpiSlice;
    activeRegions: DashboardKpiSlice;
  };
  time_series: Array<{ period: string; reports: number; satisfaction: number }>;
  category_distribution: Array<{ name: string; value: number }>;
  heatmap: Array<{ x: string; y: string; value: number }>;
  top_regions: Array<{ name: string; value: number }>;
};

export type AnalyticsDashboardRange = { from?: Date; to?: Date };

export function useAnalyticsDashboardSummary(range?: AnalyticsDashboardRange) {
  const [data, setData] = useState<AnalyticsDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pStart = range?.from?.toISOString() ?? null;
  const pEnd = range?.to?.toISOString() ?? null;

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: raw, error: rpcErr } = await supabase.rpc('get_analytics_dashboard_summary', {
        p_start: pStart,
        p_end: pEnd,
      });
      if (rpcErr) throw rpcErr;
      setData(raw as AnalyticsDashboardSummary);
    } catch (e) {
      console.error('[useAnalyticsDashboardSummary]', e);
      setData(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  }, [pStart, pEnd]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
}
