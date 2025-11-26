import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TransportLine {
  id: string;
  line_code: string;
  line_name: string;
  line_type: string;
  regions: string[];
}

export const useTransportLines = () => {
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLines();
  }, []);

  const fetchLines = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transport_lines')
        .select('*')
        .order('line_code');

      if (error) throw error;
      setLines(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar linhas');
    } finally {
      setLoading(false);
    }
  };

  const searchLines = (query: string): TransportLine[] => {
    if (!query) return lines;
    
    const lowerQuery = query.toLowerCase();
    return lines.filter(
      line =>
        line.line_code.toLowerCase().includes(lowerQuery) ||
        line.line_name.toLowerCase().includes(lowerQuery)
    );
  };

  return { lines, loading, error, searchLines };
};
