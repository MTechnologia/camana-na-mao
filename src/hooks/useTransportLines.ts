import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  searchTransportLinesOlhoVivo,
  type TransportLineCatalogRow,
} from '@/lib/transportLinesApi';

interface TransportLine {
  id: string;
  line_code: string;
  line_name: string;
  line_type: string;
  regions: string[];
}

/** Linha retornada por busca remota (Olho Vivo + transport_lines). */
export type TransportLineSearchRow = Pick<
  TransportLine,
  'id' | 'line_code' | 'line_name' | 'line_type'
> & {
  sptrans_codigo_linha?: number | null;
  direction_label?: string;
};

export type UseTransportLinesOptions = {
  /** Se false, não busca o catálogo completo (ex.: chat só usa searchLinesRemote). Default: true */
  loadCatalog?: boolean;
};

export const useTransportLines = (options: UseTransportLinesOptions = {}) => {
  const loadCatalog = options.loadCatalog !== false;
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [loading, setLoading] = useState(loadCatalog);
  const [error, setError] = useState<string | null>(null);

  const fetchLines = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('transport_lines')
        .select('*')
        .order('line_code');

      if (fetchErr) throw fetchErr;
      setLines(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar linhas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadCatalog) {
      setLoading(false);
      return;
    }
    void fetchLines();
  }, [loadCatalog, fetchLines]);

  const searchLines = useCallback((query: string): TransportLine[] => {
    if (!query) return lines;

    const lowerQuery = query.toLowerCase();
    return lines.filter(
      (line) =>
        line.line_code.toLowerCase().includes(lowerQuery) ||
        line.line_name.toLowerCase().includes(lowerQuery)
    );
  }, [lines]);

  /**
   * Busca no servidor (ilike código/nome), usada pelo InlineLinePicker no chat.
   * Mantém a mesma query que existia no componente, centralizada no hook.
   */
  const searchLinesRemote = useCallback(
    async (searchQuery: string, remoteLimit = 8): Promise<TransportLineSearchRow[]> => {
      const q = searchQuery.trim();
      if (q.length < 2) return [];

      try {
        const olhoRows = await searchTransportLinesOlhoVivo(q, remoteLimit);
        if (olhoRows.length > 0) {
          return olhoRows.map((row: TransportLineCatalogRow) => ({
            id: row.id,
            line_code: row.line_code,
            line_name: row.line_name,
            line_type: row.line_type,
            sptrans_codigo_linha: row.sptrans_codigo_linha,
            direction_label: row.direction_label,
          }));
        }
      } catch (err) {
        console.warn('[useTransportLines] Olho Vivo search failed, fallback DB:', err);
      }

      const { data, error: qErr } = await supabase
        .from('transport_lines')
        .select('id, line_code, line_name, line_type, sptrans_codigo_linha')
        .or(`line_code.ilike.%${q}%,line_name.ilike.%${q}%`)
        .limit(remoteLimit);

      if (qErr) throw qErr;
      return (data || []) as TransportLineSearchRow[];
    },
    [],
  );

  return { lines, loading, error, searchLines, searchLinesRemote };
};
