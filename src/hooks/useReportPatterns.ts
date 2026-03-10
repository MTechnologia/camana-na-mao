import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const mockPatterns: Pattern[] = [
  {
    id: 'mock-1',
    line_id: null,
    pattern_type: 'delay',
    description: 'Atrasos frequentes na linha 8000 - Terminal Lapa',
    occurrence_count: 47,
    first_detected_at: '2025-10-15T08:30:00Z',
    last_occurrence_at: '2025-11-25T18:45:00Z',
    average_severity: 'high',
    suggested_action: 'Verificar horários de pico e avaliar aumento de frota',
    status: 'active'
  },
  {
    id: 'mock-2',
    line_id: null,
    pattern_type: 'overcrowding',
    description: 'Superlotação constante na linha 917H - Metrô Santana',
    occurrence_count: 32,
    first_detected_at: '2025-09-20T07:00:00Z',
    last_occurrence_at: '2025-11-26T08:15:00Z',
    average_severity: 'critical',
    suggested_action: 'Aumentar frequência nos horários de pico manhã (6h-9h)',
    status: 'active'
  },
  {
    id: 'mock-3',
    line_id: null,
    pattern_type: 'broken_ac',
    description: 'Ar-condicionado com defeito na linha 5106 - Pq. Dom Pedro II',
    occurrence_count: 18,
    first_detected_at: '2025-11-01T14:00:00Z',
    last_occurrence_at: '2025-11-24T16:30:00Z',
    average_severity: 'medium',
    suggested_action: 'Encaminhar veículos para manutenção preventiva',
    status: 'active'
  },
  {
    id: 'mock-4',
    line_id: null,
    pattern_type: 'route_change',
    description: 'Desvios não informados na região da Av. Paulista',
    occurrence_count: 12,
    first_detected_at: '2025-11-10T09:00:00Z',
    last_occurrence_at: '2025-11-23T11:00:00Z',
    average_severity: 'medium',
    suggested_action: 'Melhorar comunicação de desvios em tempo real no app',
    status: 'active'
  },
  {
    id: 'mock-5',
    line_id: null,
    pattern_type: 'safety',
    description: 'Relatos de insegurança no Terminal Santo Amaro após 21h',
    occurrence_count: 8,
    first_detected_at: '2025-11-05T21:30:00Z',
    last_occurrence_at: '2025-11-22T22:15:00Z',
    average_severity: 'high',
    suggested_action: 'Encaminhar para secretaria de segurança pública',
    status: 'active'
  }
];

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

  const fetchPatterns = useCallback(async () => {
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
      setPatterns(data && data.length > 0 ? data : mockPatterns);
    } catch (err) {
      console.error('Error fetching patterns:', err);
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  return { patterns, loading, refetch: fetchPatterns };
};
