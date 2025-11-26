import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Pattern {
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
}

export const useReportPatterns = (lineId?: string) => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
  }, [lineId]);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('report_patterns')
        .select('*')
        .eq('status', 'active')
        .order('occurrence_count', { ascending: false });

      if (lineId) {
        query = query.eq('line_id', lineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPatterns(data || []);
    } catch (err) {
      console.error('Error fetching patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  return { patterns, loading, refetch: fetchPatterns };
};
