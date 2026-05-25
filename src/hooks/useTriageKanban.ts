import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { TriagePriority, TriageStatus } from "@/lib/triage";
import {
  loadLatestCommissionByReportKey,
  reportCommissionKey,
  type ReportCommissionRef,
} from "@/lib/reportCommissionReferrals";
import { effectiveReportTriagePriority } from "@/lib/triagePriority";
import {
  applyKanbanDateRange,
  applyKanbanTransportCategory,
  applyKanbanUrbanCategory,
  KANBAN_FETCH_CAP,
  kanbanHasGlobalRecorte,
  kanbanTransportRowMatchesRegion,
  kanbanUrbanRowMatchesRegion,
  kanbanWantsTransportSource,
  kanbanWantsUrbanSource,
  type KanbanGlobalRecorte,
} from "@/lib/triageKanbanGlobalFilters";

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
 * Com filtro de comissão, restringe a relatos com encaminhamento temático
 * (`report_commission_referrals`) para a(s) comissão(ões) selecionada(s).
 * No card, exibe a comissão do encaminhamento mais recente.
 *
 * Prioridade no card e no filtro: `report_triage.priority` quando existir;
 * senão infere P0–P3 de `n8n_priority` e de `severity` (relatos sem triagem formal).
 */

const TABLES_REALTIME = [
  "urban_reports",
  "transport_reports",
  "report_triage",
  "report_commission_referrals",
] as const;

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
  /** Comissão temática vinculada (encaminhamento mais recente). */
  commissionId: string | null;
  commissionName: string | null;
  /** Nome de quem registrou a triagem (pode diferir do responsável formal). */
  triagedByName: string | null;
  /** Quem registrou a triagem (primeiro save / arraste no kanban). */
  triagedById: string | null;
  triageStatus: TriageStatus;
  triageNotes: string | null;
  triageUpdatedAt: string | null;
  daysSinceTriageUpdate: number;
}

export interface KanbanFilters extends KanbanGlobalRecorte {
  /** Filtra por prioridade (vazio = todas). */
  priorities?: TriagePriority[];
  /** Filtra por comissão temática (vazio = todas). */
  commissionIds?: string[];
  /** Filtra por fonte (urban/transport). */
  sources?: KanbanReportSource[];
  /** Busca textual por título/protocolo. */
  search?: string;
}

const URBAN_KANBAN_FIELDS =
  "id, protocol_code, description, category, status, severity, n8n_priority, created_at, updated_at, location_address, neighborhood, latitude, longitude";

const TRANSPORT_KANBAN_FIELDS =
  "id, protocol_code, description, report_type, status, severity, n8n_priority, created_at, updated_at, location, stop_name";

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
  location_address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
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
  location: string | null;
  stop_name: string | null;
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
        c: filters.commissionIds ?? [],
        s: filters.sources ?? [],
        q: filters.search ?? "",
        gf: filters.createdFrom?.toISOString() ?? null,
        gt: filters.createdTo?.toISOString() ?? null,
        gr: filters.globalRegion ?? "all",
        gc: filters.globalCategory ?? "all",
      }),
    [
      filters.priorities,
      filters.commissionIds,
      filters.sources,
      filters.search,
      filters.createdFrom,
      filters.createdTo,
      filters.globalRegion,
      filters.globalCategory,
    ],
  );

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const globalRecorte: KanbanGlobalRecorte = {
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
        globalRegion: filters.globalRegion,
        globalCategory: filters.globalCategory,
      };
      const fetchLimit = kanbanHasGlobalRecorte(globalRecorte) ? KANBAN_FETCH_CAP : 200;

      const wantsUrban = kanbanWantsUrbanSource(filters.sources, filters.globalCategory);
      const wantsTransport = kanbanWantsTransportSource(filters.sources, filters.globalCategory);

      const commissionIdsFilter = (filters.commissionIds ?? []).filter(Boolean);

      const fetchUrbanByIds = async (ids: string[]) => {
        if (ids.length === 0) return [] as UrbanRow[];
        let q = supabase
          .from("urban_reports")
          .select(URBAN_KANBAN_FIELDS)
          .in("id", ids)
          .not("status", "in", "(closed,rejected)");
        q = applyKanbanDateRange(q, globalRecorte);
        q = applyKanbanUrbanCategory(q, filters.globalCategory);
        const { data, error } = await q;
        if (error) throw error;
        return ((data ?? []) as UrbanRow[]).filter((r) =>
          kanbanUrbanRowMatchesRegion(r, filters.globalRegion),
        );
      };

      const fetchTransportByIds = async (ids: string[]) => {
        if (ids.length === 0) return [] as TransportRow[];
        let q = supabase
          .from("transport_reports")
          .select(TRANSPORT_KANBAN_FIELDS)
          .in("id", ids)
          .not("status", "in", "(closed,rejected)");
        q = applyKanbanDateRange(q, globalRecorte);
        q = applyKanbanTransportCategory(q, filters.globalCategory);
        const { data, error } = await q;
        if (error) throw error;
        return ((data ?? []) as TransportRow[]).filter((r) =>
          kanbanTransportRowMatchesRegion(r, filters.globalRegion),
        );
      };

      const fetchUrbanOpen = async () => {
        let q = supabase
          .from("urban_reports")
          .select(URBAN_KANBAN_FIELDS)
          .not("status", "in", "(closed,rejected)")
          .order("created_at", { ascending: false })
          .limit(fetchLimit);
        q = applyKanbanDateRange(q, globalRecorte);
        q = applyKanbanUrbanCategory(q, filters.globalCategory);
        const { data, error } = await q;
        if (error) throw error;
        return ((data ?? []) as UrbanRow[]).filter((r) =>
          kanbanUrbanRowMatchesRegion(r, filters.globalRegion),
        );
      };

      const fetchTransportOpen = async () => {
        let q = supabase
          .from("transport_reports")
          .select(TRANSPORT_KANBAN_FIELDS)
          .not("status", "in", "(closed,rejected)")
          .order("created_at", { ascending: false })
          .limit(fetchLimit);
        q = applyKanbanDateRange(q, globalRecorte);
        q = applyKanbanTransportCategory(q, filters.globalCategory);
        const { data, error } = await q;
        if (error) throw error;
        return ((data ?? []) as TransportRow[]).filter((r) =>
          kanbanTransportRowMatchesRegion(r, filters.globalRegion),
        );
      };
      const triageSelect =
        "id, source_table, report_id, priority, assignee_id, triaged_by, triage_status, notes, updated_at";

      let urbanRows: UrbanRow[] = [];
      let transportRows: TransportRow[] = [];
      let triageRows: TriageRow[] = [];

      if (commissionIdsFilter.length > 0) {
        const { data: refRows, error: refErr } = await supabase
          .from("report_commission_referrals")
          .select("source_table, report_id, commission_id, referred_at")
          .in("commission_id", commissionIdsFilter)
          .order("referred_at", { ascending: false })
          .limit(800);
        if (refErr) throw refErr;

        const keysByReport = new Map<
          string,
          { source_table: "urban_reports" | "transport_reports"; report_id: string }
        >();
        for (const row of (refRows ?? []) as Array<{
          source_table: "urban_reports" | "transport_reports";
          report_id: string;
        }>) {
          const key = reportCommissionKey(row.source_table, row.report_id);
          if (!keysByReport.has(key)) keysByReport.set(key, row);
        }

        let refList = [...keysByReport.values()];
        if (filters.sources && filters.sources.length > 0) {
          refList = refList.filter((r) =>
            r.source_table === "urban_reports" ? wantsUrban : wantsTransport,
          );
        }

        const urbanIds = [
          ...new Set(
            refList
              .filter((r) => r.source_table === "urban_reports")
              .map((r) => r.report_id),
          ),
        ];
        const transportIds = [
          ...new Set(
            refList
              .filter((r) => r.source_table === "transport_reports")
              .map((r) => r.report_id),
          ),
        ];

        [urbanRows, transportRows] = await Promise.all([
          wantsUrban ? fetchUrbanByIds(urbanIds) : Promise.resolve([] as UrbanRow[]),
          wantsTransport ? fetchTransportByIds(transportIds) : Promise.resolve([] as TransportRow[]),
        ]);

        const urbanIdSet = new Set(urbanRows.map((r) => r.id));
        const transportIdSet = new Set(transportRows.map((r) => r.id));

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
          ...((uTri.data ?? []) as TriageRow[]).filter((t) => urbanIdSet.has(t.report_id)),
          ...((tTri.data ?? []) as TriageRow[]).filter((t) => transportIdSet.has(t.report_id)),
        ];
      } else {
        [urbanRows, transportRows] = await Promise.all([
          wantsUrban ? fetchUrbanOpen() : Promise.resolve([] as UrbanRow[]),
          wantsTransport ? fetchTransportOpen() : Promise.resolve([] as TransportRow[]),
        ]);

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
        triageByKey.set(reportCommissionKey(t.source_table, t.report_id), t);
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

      const urbanIds = urbanRows.map((r) => r.id);
      const transportIds = transportRows.map((r) => r.id);
      const commissionByKey = await loadLatestCommissionByReportKey(urbanIds, transportIds);

      const all: KanbanItem[] = [];

      for (const r of urbanRows) {
        const t = triageByKey.get(reportCommissionKey("urban_reports", r.id));
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
            commissionByKey.get(reportCommissionKey("urban_reports", r.id)),
          ),
        );
      }
      for (const r of transportRows) {
        const t = triageByKey.get(reportCommissionKey("transport_reports", r.id));
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
            commissionByKey.get(reportCommissionKey("transport_reports", r.id)),
          ),
        );
      }

      // Aplica filtros client-side.
      const q = (filters.search ?? "").trim().toLowerCase();
      const filtered = all.filter((it) => {
        if (filters.priorities && filters.priorities.length > 0) {
          if (!it.priority || !filters.priorities.includes(it.priority)) return false;
        }
        if (filters.commissionIds && filters.commissionIds.length > 0) {
          const wanted = new Set(filters.commissionIds);
          if (!it.commissionId || !wanted.has(it.commissionId)) return false;
        }
        if (q) {
          const hay =
            `${it.title} ${it.protocolCode ?? ""} ${it.commissionName ?? ""}`.toLowerCase();
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
  commission?: ReportCommissionRef,
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
    priority: effectiveReportTriagePriority(triage?.priority, n8nPriority, severity),
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
    commissionId: commission?.commissionId ?? null,
    commissionName: commission?.commissionName ?? null,
    triageStatus: triage?.triage_status ?? "untriaged",
    triageNotes: triage?.notes ?? null,
    triageUpdatedAt: triage?.updated_at ?? null,
    daysSinceTriageUpdate: triage?.updated_at ? daysSince(triage.updated_at) : daysSince(createdAt),
  };
}
