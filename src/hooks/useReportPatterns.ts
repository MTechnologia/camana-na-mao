import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type ReportPatternRow = Tables<'report_patterns'>;

export const useReportPatterns = (lineId?: string) => {
  const [patterns, setPatterns] = useState<ReportPatternRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatterns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('report_patterns').select('*').eq('status', 'active');
      if (lineId) {
        query = query.eq('line_id', lineId);
      }
      query = query.order('occurrence_count', { ascending: false });

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;
      setPatterns((data as ReportPatternRow[]) ?? []);
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setPatterns([]);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Erro ao carregar padrões';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  return { patterns, loading, error, refetch: fetchPatterns };
};
