import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { TriagePriority, TriageStatus } from "@/lib/triage";

/**
 * HU-10.3 — Vista agregada para o kanban de triagem.
 *
 * Busca os últimos N relatos (urban + transport) e suas triagens associadas
 * (LEFT JOIN), retornando uma lista normalizada. Relatos sem triage entram
 * como `triageStatus = 'untriaged'` para irem na primeira coluna do board.
 *
 * Mantém a query simples: 2 selects paginados + map de triage. Para volume
 * grande (>1000 relatos abertos) vale criar uma view dedicada no banco; por
 * ora o filtro de "abertos" + LIMIT 400 cobre o caso.
 */

const TABLES_REALTIME = ["urban_reports", "transport_reports", "report_triage"] as const;

export type KanbanReportSource = "urban" | "transport";

export interface KanbanItem {
  reportId: string;
  source: KanbanReportSource;
  title: string;
  protocolCode: string | null;
  status: string | null;
  severity: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;

  // Triagem (pode ser null para relatos não triados ainda).
  triageId: string | null;
  priority: TriagePriority | null;
  assigneeId: string | null;
  assigneeName: string | null;
  triageStatus: TriageStatus;
  triageNotes: string | null;
  triageUpdatedAt: string | null;
  daysSinceTriageUpdate: number;
}

export interface KanbanFilters {
  /** Filtra por prioridade (vazio = todas). */
  priorities?: TriagePriority[];
  /** Filtra por responsável (user_id) (vazio = todos). */
  assigneeIds?: string[];
  /** Filtra por fonte (urban/transport). */
  sources?: KanbanReportSource[];
  /** Busca textual por título/protocolo. */
  search?: string;
}

export interface UseTriageKanbanResult {
  itemsByStatus: Record<TriageStatus, KanbanItem[]>;
  totalItems: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

interface UrbanRow {
  id: string;
  protocol_code: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  severity: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TransportRow {
  id: string;
  protocol_code: string | null;
  description: string | null;
  report_type: string | null;
  status: string | null;
  severity: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TriageRow {
  id: string;
  source_table: "urban_reports" | "transport_reports";
  report_id: string;
  priority: TriagePriority | null;
  assignee_id: string | null;
  triage_status: TriageStatus;
  notes: string | null;
  updated_at: string;
}

function truncate(s: string | null, n = 60): string {
  const t = (s ?? "").trim();
  if (!t) return "(sem título)";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function useTriageKanban(
  filters: KanbanFilters = {},
): UseTriageKanbanResult {
  const [items, setItems] = useState<KanbanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        p: filters.priorities ?? [],
        a: filters.assigneeIds ?? [],
        s: filters.sources ?? [],
        q: filters.search ?? "",
      }),
    [filters.priorities, filters.assigneeIds, filters.sources, filters.search],
  );

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const wantsUrban = !filters.sources || filters.sources.includes("urban");
      const wantsTransport =
        !filters.sources || filters.sources.includes("transport");

      // Busca os 200 mais recentes de cada fonte (status != closed/rejected
      // pra evitar poluir o kanban com casos já finalizados).
      const [urbanRes, transportRes, triageRes] = await Promise.all([
        wantsUrban
          ? supabase
              .from("urban_reports")
              .select(
                "id, protocol_code, description, category, status, severity, created_at, updated_at",
              )
              .not("status", "in", "(closed,rejected)")
              .order("created_at", { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [], error: null }),
        wantsTransport
          ? supabase
              .from("transport_reports")
              .select(
                "id, protocol_code, description, report_type, status, severity, created_at, updated_at",
              )
              .not("status", "in", "(closed,rejected)")
              .order("created_at", { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("report_triage")
          .select(
            "id, source_table, report_id, priority, assignee_id, triage_status, notes, updated_at",
          )
          .limit(500),
      ]);

      if (urbanRes.error) throw urbanRes.error;
      if (transportRes.error) throw transportRes.error;
      if (triageRes.error) throw triageRes.error;

      const triageByKey = new Map<string, TriageRow>();
      for (const t of (triageRes.data ?? []) as TriageRow[]) {
        triageByKey.set(`${t.source_table}|${t.report_id}`, t);
      }

      // Coleta IDs únicos de assignees.
      const assigneeIds = Array.from(
        new Set(
          (triageRes.data ?? [])
            .map((t: TriageRow) => t.assignee_id)
            .filter(Boolean) as string[],
        ),
      );
      const nameByUser = new Map<string, string>();
      if (assigneeIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assigneeIds);
        for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null }>) {
          if (p.full_name) nameByUser.set(p.id, p.full_name);
        }
      }

      const all: KanbanItem[] = [];

      for (const r of (urbanRes.data ?? []) as UrbanRow[]) {
        const t = triageByKey.get(`urban_reports|${r.id}`);
        all.push(buildItem("urban", r.id, truncate(r.description), r.protocol_code, r.status, r.severity, r.category, r.created_at, r.updated_at ?? r.created_at, t, nameByUser));
      }
      for (const r of (transportRes.data ?? []) as TransportRow[]) {
        const t = triageByKey.get(`transport_reports|${r.id}`);
        all.push(buildItem("transport", r.id, truncate(r.description), r.protocol_code, r.status, r.severity, r.report_type, r.created_at, r.updated_at ?? r.created_at, t, nameByUser));
      }

      // Aplica filtros client-side.
      const q = (filters.search ?? "").trim().toLowerCase();
      const filtered = all.filter((it) => {
        if (filters.priorities && filters.priorities.length > 0) {
          if (!it.priority || !filters.priorities.includes(it.priority)) return false;
        }
        if (filters.assigneeIds && filters.assigneeIds.length > 0) {
          if (!it.assigneeId || !filters.assigneeIds.includes(it.assigneeId)) return false;
        }
        if (q) {
          const hay = `${it.title} ${it.protocolCode ?? ""} ${it.assigneeName ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      // Ordena: prioridade desc, então updatedAt desc.
      const priorityRank: Record<string, number> = { P0: 4, P1: 3, P2: 2, P3: 1 };
      filtered.sort((a, b) => {
        const ra = a.priority ? priorityRank[a.priority] ?? 0 : 0;
        const rb = b.priority ? priorityRank[b.priority] ?? 0 : 0;
        if (rb !== ra) return rb - ra;
        return b.updatedAt.localeCompare(a.updatedAt);
      });

      setItems(filtered);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useTriageKanban] fetch error", err);
      setError("Não foi possível carregar o kanban.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeRefresh(TABLES_REALTIME, fetchData);

  const itemsByStatus = useMemo(() => {
    const acc: Record<TriageStatus, KanbanItem[]> = {
      untriaged: [],
      triaged: [],
      in_progress: [],
      resolved: [],
      closed: [],
    };
    for (const it of items) acc[it.triageStatus].push(it);
    return acc;
  }, [items]);

  return {
    itemsByStatus,
    totalItems: items.length,
    isLoading,
    error,
    lastUpdate,
    refresh: fetchData,
  };
}

function buildItem(
  source: KanbanReportSource,
  reportId: string,
  title: string,
  protocolCode: string | null,
  status: string | null,
  severity: string | null,
  category: string | null,
  createdAt: string,
  updatedAt: string,
  triage: TriageRow | undefined,
  nameByUser: Map<string, string>,
): KanbanItem {
  return {
    reportId,
    source,
    title,
    protocolCode,
    status,
    severity,
    category,
    createdAt,
    updatedAt,
    triageId: triage?.id ?? null,
    priority: triage?.priority ?? null,
    assigneeId: triage?.assignee_id ?? null,
    assigneeName: triage?.assignee_id ? nameByUser.get(triage.assignee_id) ?? null : null,
    triageStatus: triage?.triage_status ?? "untriaged",
    triageNotes: triage?.notes ?? null,
    triageUpdatedAt: triage?.updated_at ?? null,
    daysSinceTriageUpdate: triage?.updated_at ? daysSince(triage.updated_at) : daysSince(createdAt),
  };
}
