import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReportPatternRow {
  id: string;
  line_id: string | null;
  pattern_type: string;
  description: string;
  occurrence_count: number;
  first_detected_at: string;
  last_occurrence_at: string;
  average_severity: string | null;
  suggested_action: string | null;
  status: string;
  peak_hours?: unknown;
  avg_severity?: number | null;
  window_start?: string | null;
  window_end?: string | null;
  last_analyzed_at?: string | null;
}

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
      setError(err instanceof Error ? err.message : 'Erro ao carregar padrões');
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  return { patterns, loading, error, refetch: fetchPatterns };
};
