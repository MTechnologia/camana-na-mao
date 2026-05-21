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
 * Triagem: sem filtro de responsável, carrega os N relatos abertos mais recentes
 * e busca `report_triage` só para esses IDs (evita `.limit(500)` solto no triage,
 * que omitia linhas e deixava `assignee_id` sempre null no card).
 * Com filtro de responsável, busca triagens em que a pessoa é `assignee_id`
 * **ou** (sem responsável formal) `triaged_by` — o drag no kanban só preenchia
 * `triaged_by`, então o filtro precisa considerar os dois.
 *
 * Prioridade no card e no filtro: `report_triage.priority` quando existir;
 * senão infere P0–P3 de `n8n_priority` e de `severity` (relatos sem triagem formal).
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
  /** Nome de quem registrou a triagem (pode diferir do responsável formal). */
  triagedByName: string | null;
  /** Quem registrou a triagem (primeiro save / arraste no kanban). */
  triagedById: string | null;
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
  n8n_priority: string | null;
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
  n8n_priority: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TriageRow {
  id: string;
  source_table: "urban_reports" | "transport_reports";
  report_id: string;
  priority: TriagePriority | null;
  assignee_id: string | null;
  triaged_by: string | null;
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

function isTriagePriority(v: unknown): v is TriagePriority {
  return v === "P0" || v === "P1" || v === "P2" || v === "P3";
}

function normKey(s: string): string {
  return stripDiacritics(s.toLowerCase().trim());
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Mapeia textos do n8n / legado (`critica`, `urgente`, …) para P0–P3. */
function inferPriorityFromN8n(n8n: string | null | undefined): TriagePriority | null {
  if (!n8n) return null;
  const s = normKey(n8n);
  if (!s) return null;
  if (/\bp0\b/.test(s) || s.includes("critica") || s.includes("critico") || s.includes("critical")) {
    return "P0";
  }
  if (/\bp1\b/.test(s) || s.includes("urgente") || s.includes("alta") || s.includes("high")) {
    return "P1";
  }
  if (/\bp2\b/.test(s) || s.includes("normal") || s.includes("media") || s.includes("moderate") || s.includes("medio")) {
    return "P2";
  }
  if (/\bp3\b/.test(s) || s.includes("baixa") || s.includes("low")) {
    return "P3";
  }
  return null;
}

function inferPriorityFromSeverity(sev: string | null | undefined): TriagePriority | null {
  if (!sev) return null;
  const s = normKey(sev);
  if (!s) return null;
  if (s.includes("crit")) return "P0";
  if (s.includes("alto") || s.includes("high") || s === "alta") return "P1";
  if (s.includes("med") || s.includes("moder")) return "P2";
  if (s.includes("baix") || s.includes("low")) return "P3";
  return null;
}

function effectiveKanbanPriority(
  triagePriority: TriagePriority | null | undefined,
  n8nPriority: string | null | undefined,
  severity: string | null | undefined,
): TriagePriority | null {
  if (isTriagePriority(triagePriority)) return triagePriority;
  return inferPriorityFromN8n(n8nPriority) ?? inferPriorityFromSeverity(severity);
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

      const assigneeIdsFilter = (filters.assigneeIds ?? []).filter(Boolean);
      const triageSelect =
        "id, source_table, report_id, priority, assignee_id, triaged_by, triage_status, notes, updated_at";

      let urbanRows: UrbanRow[] = [];
      let transportRows: TransportRow[] = [];
      let triageRows: TriageRow[] = [];

      if (assigneeIdsFilter.length > 0) {
        const [byAssigneeRes, byTriagerRes] = await Promise.all([
          supabase
            .from("report_triage")
            .select(triageSelect)
            .in("assignee_id", assigneeIdsFilter)
            .order("updated_at", { ascending: false })
            .limit(400),
          supabase
            .from("report_triage")
            .select(triageSelect)
            .is("assignee_id", null)
            .in("triaged_by", assigneeIdsFilter)
            .order("updated_at", { ascending: false })
            .limit(400),
        ]);

        if (byAssigneeRes.error) throw byAssigneeRes.error;
        if (byTriagerRes.error) throw byTriagerRes.error;

        const merged = new Map<string, TriageRow>();
        for (const row of [
          ...((byAssigneeRes.data ?? []) as TriageRow[]),
          ...((byTriagerRes.data ?? []) as TriageRow[]),
        ]) {
          const key = `${row.source_table}|${row.report_id}`;
          const prev = merged.get(key);
          if (
            !prev
            || new Date(row.updated_at).getTime() >= new Date(prev.updated_at).getTime()
          ) {
            merged.set(key, row);
          }
        }

        let triList = Array.from(merged.values());
        triList.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        triList = triList.slice(0, 400);

        if (filters.sources && filters.sources.length > 0) {
          triList = triList.filter((t) =>
            t.source_table === "urban_reports" ? wantsUrban : wantsTransport,
          );
        }

        const urbanIds = [
          ...new Set(
            triList
              .filter((t) => t.source_table === "urban_reports")
              .map((t) => t.report_id),
          ),
        ];
        const transportIds = [
          ...new Set(
            triList
              .filter((t) => t.source_table === "transport_reports")
              .map((t) => t.report_id),
          ),
        ];

        const [urbanRes, transportRes] = await Promise.all([
          wantsUrban && urbanIds.length > 0
            ? supabase
                .from("urban_reports")
                .select(
                  "id, protocol_code, description, category, status, severity, n8n_priority, created_at, updated_at",
                )
                .in("id", urbanIds)
                .not("status", "in", "(closed,rejected)")
            : Promise.resolve({ data: [] as UrbanRow[], error: null }),
          wantsTransport && transportIds.length > 0
            ? supabase
                .from("transport_reports")
                .select(
                  "id, protocol_code, description, report_type, status, severity, n8n_priority, created_at, updated_at",
                )
                .in("id", transportIds)
                .not("status", "in", "(closed,rejected)")
            : Promise.resolve({ data: [] as TransportRow[], error: null }),
        ]);

        if (urbanRes.error) throw urbanRes.error;
        if (transportRes.error) throw transportRes.error;

        urbanRows = (urbanRes.data ?? []) as UrbanRow[];
        transportRows = (transportRes.data ?? []) as TransportRow[];

        const urbanIdSet = new Set(urbanRows.map((r) => r.id));
        const transportIdSet = new Set(transportRows.map((r) => r.id));
        triageRows = triList.filter(
          (t) =>
            (t.source_table === "urban_reports" && urbanIdSet.has(t.report_id))
            || (t.source_table === "transport_reports" && transportIdSet.has(t.report_id)),
        );
      } else {
        const [urbanRes, transportRes] = await Promise.all([
          wantsUrban
            ? supabase
                .from("urban_reports")
                .select(
                  "id, protocol_code, description, category, status, severity, n8n_priority, created_at, updated_at",
                )
                .not("status", "in", "(closed,rejected)")
                .order("created_at", { ascending: false })
                .limit(200)
            : Promise.resolve({ data: [] as UrbanRow[], error: null }),
          wantsTransport
            ? supabase
                .from("transport_reports")
                .select(
                  "id, protocol_code, description, report_type, status, severity, n8n_priority, created_at, updated_at",
                )
                .not("status", "in", "(closed,rejected)")
                .order("created_at", { ascending: false })
                .limit(200)
            : Promise.resolve({ data: [] as TransportRow[], error: null }),
        ]);

        if (urbanRes.error) throw urbanRes.error;
        if (transportRes.error) throw transportRes.error;

        urbanRows = (urbanRes.data ?? []) as UrbanRow[];
        transportRows = (transportRes.data ?? []) as TransportRow[];

        const urbanIds = urbanRows.map((r) => r.id);
        const transportIds = transportRows.map((r) => r.id);

        const [uTri, tTri] = await Promise.all([
          wantsUrban && urbanIds.length > 0
            ? supabase
                .from("report_triage")
                .select(triageSelect)
                .eq("source_table", "urban_reports")
                .in("report_id", urbanIds)
            : Promise.resolve({ data: [], error: null }),
          wantsTransport && transportIds.length > 0
            ? supabase
                .from("report_triage")
                .select(triageSelect)
                .eq("source_table", "transport_reports")
                .in("report_id", transportIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (uTri.error) throw uTri.error;
        if (tTri.error) throw tTri.error;

        triageRows = [
          ...((uTri.data ?? []) as TriageRow[]),
          ...((tTri.data ?? []) as TriageRow[]),
        ];
      }

      const triageByKey = new Map<string, TriageRow>();
      for (const t of triageRows) {
        triageByKey.set(`${t.source_table}|${t.report_id}`, t);
      }

      const assigneeIds = Array.from(
        new Set(
          triageRows.flatMap((t: TriageRow) =>
            [t.assignee_id, t.triaged_by].filter(Boolean) as string[],
          ),
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

      for (const r of urbanRows) {
        const t = triageByKey.get(`urban_reports|${r.id}`);
        all.push(
          buildItem(
            "urban",
            r.id,
            truncate(r.description),
            r.protocol_code,
            r.status,
            r.severity,
            r.n8n_priority,
            r.category,
            r.created_at,
            r.updated_at ?? r.created_at,
            t,
            nameByUser,
          ),
        );
      }
      for (const r of transportRows) {
        const t = triageByKey.get(`transport_reports|${r.id}`);
        all.push(
          buildItem(
            "transport",
            r.id,
            truncate(r.description),
            r.protocol_code,
            r.status,
            r.severity,
            r.n8n_priority,
            r.report_type,
            r.created_at,
            r.updated_at ?? r.created_at,
            t,
            nameByUser,
          ),
        );
      }

      // Aplica filtros client-side.
      const q = (filters.search ?? "").trim().toLowerCase();
      const filtered = all.filter((it) => {
        if (filters.priorities && filters.priorities.length > 0) {
          if (!it.priority || !filters.priorities.includes(it.priority)) return false;
        }
        if (filters.assigneeIds && filters.assigneeIds.length > 0) {
          const wanted = new Set(
            filters.assigneeIds.map((id) => id.toLowerCase()),
          );
          const match = (uid: string | null) =>
            Boolean(uid && wanted.has(uid.toLowerCase()));
          if (!match(it.assigneeId) && !match(it.triagedById)) return false;
        }
        if (q) {
          const hay =
            `${it.title} ${it.protocolCode ?? ""} ${it.assigneeName ?? ""} ${it.triagedByName ?? ""}`.toLowerCase();
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
  n8nPriority: string | null,
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
    priority: effectiveKanbanPriority(triage?.priority, n8nPriority, severity),
    assigneeId: triage?.assignee_id ?? null,
    assigneeName: (() => {
      if (triage?.assignee_id) return nameByUser.get(triage.assignee_id) ?? null;
      if (triage?.triaged_by) return nameByUser.get(triage.triaged_by) ?? null;
      return null;
    })(),
    triagedByName: triage?.triaged_by
      ? nameByUser.get(triage.triaged_by) ?? null
      : null,
    triagedById: triage?.triaged_by ?? null,
    triageStatus: triage?.triage_status ?? "untriaged",
    triageNotes: triage?.notes ?? null,
    triageUpdatedAt: triage?.updated_at ?? null,
    daysSinceTriageUpdate: triage?.updated_at ? daysSince(triage.updated_at) : daysSince(createdAt),
  };
}
