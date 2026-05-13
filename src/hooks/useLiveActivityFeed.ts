import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/**
 * HU-1.5 — Feed de atividade recente em tempo real para o dashboard executivo.
 *
 * Combina sinais de quatro fontes:
 *   - Novos relatos urbanos (`urban_reports`)
 *   - Novos relatos de transporte (`transport_reports`)
 *   - Novas inscrições em audiências (`audiencia_inscricoes`)
 *   - Novas participações em audiências (`audiencia_participacoes`)
 *
 * Cada chamada do feed busca os últimos N de cada fonte e retorna a união
 * ordenada por timestamp desc (até `limit` itens). Realtime via Supabase
 * channels: assim que algo é inserido em qualquer tabela, o feed re-busca.
 */

export type ActivityKind =
  | "urban_report"
  | "transport_report"
  | "audiencia_inscricao"
  | "audiencia_participacao";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  severity?: string | null;
  timestamp: string;
}

const PER_SOURCE_LIMIT = 5;
const REALTIME_TABLES = [
  "urban_reports",
  "transport_reports",
  "audiencia_inscricoes",
  "audiencia_participacoes",
] as const;

interface UrbanRow {
  id: string;
  category: string | null;
  severity: string | null;
  neighborhood: string | null;
  created_at: string | null;
}

interface TransportRow {
  id: string;
  report_type: string | null;
  sub_category: string | null;
  severity: string | null;
  location: string | null;
  created_at: string | null;
}

interface InscricaoRow {
  id: string;
  audiencia_id: string;
  created_at: string | null;
  audiencias: { titulo: string } | { titulo: string }[] | null;
}

interface ParticipacaoRow {
  id: string;
  audiencia_id: string;
  tipo: string;
  created_at: string | null;
  audiencias: { titulo: string } | { titulo: string }[] | null;
}

function singleTitulo(rel: InscricaoRow["audiencias"] | ParticipacaoRow["audiencias"]): string {
  if (!rel) return "Audiência";
  if (Array.isArray(rel)) return rel[0]?.titulo || "Audiência";
  return rel.titulo || "Audiência";
}

async function fetchRecentActivity(limit: number): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];

  // 1) Urban reports
  try {
    const { data, error } = await supabase
      .from("urban_reports")
      .select("id, category, severity, neighborhood, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT);
    if (!error) {
      (data as UrbanRow[] | null)?.forEach((r) => {
        if (!r.created_at) return;
        items.push({
          id: `urban-${r.id}`,
          kind: "urban_report",
          title: r.category || "Relato urbano",
          subtitle: r.neighborhood || undefined,
          severity: r.severity,
          timestamp: r.created_at,
        });
      });
    }
  } catch (err) {
    console.warn("[useLiveActivityFeed] urban_reports", err);
  }

  // 2) Transport reports
  try {
    const { data, error } = await supabase
      .from("transport_reports")
      .select("id, report_type, sub_category, severity, location, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT);
    if (!error) {
      (data as TransportRow[] | null)?.forEach((r) => {
        if (!r.created_at) return;
        items.push({
          id: `transport-${r.id}`,
          kind: "transport_report",
          title: r.sub_category || r.report_type || "Relato de transporte",
          subtitle: r.location || undefined,
          severity: r.severity,
          timestamp: r.created_at,
        });
      });
    }
  } catch (err) {
    console.warn("[useLiveActivityFeed] transport_reports", err);
  }

  // 3) Audiencia inscricoes (lembretes)
  try {
    const { data, error } = await supabase
      .from("audiencia_inscricoes")
      .select("id, audiencia_id, created_at, audiencias(titulo)")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT);
    if (!error) {
      (data as InscricaoRow[] | null)?.forEach((r) => {
        if (!r.created_at) return;
        items.push({
          id: `inscricao-${r.id}`,
          kind: "audiencia_inscricao",
          title: "Lembrete de audiência",
          subtitle: singleTitulo(r.audiencias),
          timestamp: r.created_at,
        });
      });
    }
  } catch (err) {
    console.warn("[useLiveActivityFeed] audiencia_inscricoes", err);
  }

  // 4) Audiencia participacoes (videoconferência / escrito)
  try {
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: ParticipacaoRow[] | null; error: unknown }>;
          };
        };
      };
    })
      .from("audiencia_participacoes")
      .select("id, audiencia_id, tipo, created_at, audiencias(titulo)")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT);
    if (!error) {
      data?.forEach((r) => {
        if (!r.created_at) return;
        const tipoLabel =
          r.tipo === "videoconferencia"
            ? "Videoconferência"
            : r.tipo === "escrito"
              ? "Manifestação escrita"
              : "Participação";
        items.push({
          id: `participacao-${r.id}`,
          kind: "audiencia_participacao",
          title: tipoLabel,
          subtitle: singleTitulo(r.audiencias),
          timestamp: r.created_at,
        });
      });
    }
  } catch (err) {
    console.warn("[useLiveActivityFeed] audiencia_participacoes", err);
  }

  // Ordena por timestamp desc e limita
  return items
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function useLiveActivityFeed(limit = 15) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const fresh = await fetchRecentActivity(limit);
      setItems(fresh);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: re-busca quando qualquer das tabelas muda
  const { lastUpdate } = useRealtimeRefresh(REALTIME_TABLES, () => {
    void refresh();
  });

  return { items, isLoading, lastUpdate, refresh };
}
