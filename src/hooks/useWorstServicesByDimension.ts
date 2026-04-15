import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ServiceRatingDimensionKey } from '@/lib/serviceRatingDimensions';

export type WorstServiceRow = {
  service_id: string;
  service_name: string;
  district: string;
  service_type: string;
  avg_score: number;
  rating_count: number;
};

export function useWorstServicesByDimension(
  dimension: ServiceRatingDimensionKey,
  limit = 20,
) {
  const [rows, setRows] = useState<WorstServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: rpcErr } = await supabase.rpc('get_worst_services_by_dimension', {
        p_dimension: dimension,
        p_limit: limit,
      });
      if (rpcErr) throw rpcErr;
      const list = data as unknown;
      setRows(Array.isArray(list) ? (list as WorstServiceRow[]) : []);
    } catch (e) {
      console.error('[useWorstServicesByDimension]', e);
      setRows([]);
      setError(e instanceof Error ? e.message : 'Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  }, [dimension, limit]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  return { rows, loading, error, refetch: fetchRows };
}
