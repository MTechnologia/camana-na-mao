import { useEffect, useMemo, useState } from "react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { PERIOD_COMPARE_VALUE } from "@/lib/globalFilterOptions";
import { globalPeriodKeyToDateRange } from "@/lib/globalPeriodRange";
import { Link, useSearchParams } from "react-router-dom";
import { parseCommissionIdsFromSearchParams } from "@/lib/commissionFilterNavigation";
import { AlertCircle, AlertTriangle, ChevronDown, Inbox, Search, Building2 } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { KPICard } from "@/components/analytics/KPICard";
import { TriageKanban } from "@/components/admin/triage/TriageKanban";
import { useTriageKanban, type KanbanItem, type KanbanReportSource } from "@/hooks/useTriageKanban";
import { usePerformanceMark } from "@/hooks/usePerformanceMark";
import { supabase } from "@/integrations/supabase/client";
import {
  TRIAGE_PRIORITIES,
  TRIAGE_PRIORITY_ORDER,
  TRIAGE_STATUSES,
  type TriagePriority,
  type TriageStatus,
} from "@/lib/triage";
import { cn } from "@/lib/utils";

/**
 * HU-10.3 — Página /admin/triagem.
 *
 * Kanban estilo de triagem dos relatos abertos. KPIs no topo,
 * filtros (prioridades, comissões, fontes — multi-seleção), busca, board com 4 colunas,
 * drill-through para o ReportDetailSheet.
 */

type CommissionCatalogEntry = { commissionId: string; name: string; code: string | null };

const SOURCE_OPTIONS: { id: KanbanReportSource; label: string }[] = [
  { id: "urban", label: "Urbano" },
  { id: "transport", label: "Transporte" },
];

function sortPriorities(ids: TriagePriority[]): TriagePriority[] {
  const rank = new Map(TRIAGE_PRIORITY_ORDER.map((p, i) => [p, i]));
  return [...ids].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}

function sortSources(ids: KanbanReportSource[]): KanbanReportSource[] {
  const rank: Record<KanbanReportSource, number> = { urban: 0, transport: 1 };
  return [...ids].sort((a, b) => rank[a] - rank[b]);
}

export default function TriageKanbanPage() {
  const [searchParams] = useSearchParams();
  const { period, region, category, periodCompare, compareActive } = useGlobalFilters();

  /** Vazio = todas as prioridades. */
  const [selectedPriorities, setSelectedPriorities] = useState<TriagePriority[]>([]);
  /** Vazio = sem filtro (todas as comissões). */
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>(() =>
    parseCommissionIdsFromSearchParams(searchParams),
  );

  useEffect(() => {
    const fromUrl = parseCommissionIdsFromSearchParams(searchParams);
    if (fromUrl.length === 0) return;
    setSelectedCommissionIds(fromUrl);
  }, [searchParams]);
  const [commissionCatalog, setCommissionCatalog] = useState<CommissionCatalogEntry[]>([]);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [commissionPopoverOpen, setCommissionPopoverOpen] = useState(false);
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);
  /** Vazio = todas as fontes. */
  const [selectedSources, setSelectedSources] = useState<KanbanReportSource[]>([]);
  const [search, setSearch] = useState("");

  const globalRecorte = useMemo(() => {
    if (
      period === PERIOD_COMPARE_VALUE &&
      compareActive &&
      periodCompare.periodA?.from &&
      periodCompare.periodA?.to
    ) {
      return {
        createdFrom: periodCompare.periodA.from,
        createdTo: periodCompare.periodA.to,
        globalRegion: region,
        globalCategory: category,
      };
    }
    const { from, to } = globalPeriodKeyToDateRange(period);
    return {
      createdFrom: from,
      createdTo: to,
      globalRegion: region,
      globalCategory: category,
    };
  }, [period, region, category, periodCompare.periodA, compareActive]);

  const filters = useMemo(
    () => ({
      ...globalRecorte,
      priorities: selectedPriorities.length === 0 ? undefined : selectedPriorities,
      commissionIds: selectedCommissionIds.length === 0 ? undefined : selectedCommissionIds,
      sources: selectedSources.length === 0 ? undefined : selectedSources,
      search,
    }),
    [globalRecorte, selectedPriorities, selectedCommissionIds, selectedSources, search],
  );

  const { itemsByStatus, totalItems, isLoading, error, lastUpdate, refresh } =
    useTriageKanban(filters);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("legislative_commissions")
        .select("id, name, code")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        console.error("[TriageKanbanPage] commissions catalog", error);
        return;
      }
      setCommissionCatalog(
        (data ?? []).map((row) => ({
          commissionId: row.id,
          name: row.name,
          code: row.code ?? null,
        })),
      );
    })();
  }, []);

  /** Inclui comissões já vistas nos cards para o filtro não encolher com filtro ativo. */
  useEffect(() => {
    setCommissionCatalog((prev) => {
      const map = new Map(prev.map((e) => [e.commissionId, e]));
      for (const col of Object.values(itemsByStatus)) {
        for (const it of col) {
          if (it.commissionId && it.commissionName) {
            const existing = map.get(it.commissionId);
            map.set(it.commissionId, {
              commissionId: it.commissionId,
              name: it.commissionName,
              code: existing?.code ?? null,
            });
          }
        }
      }
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    });
  }, [itemsByStatus]);

  const selectedCommissionSet = useMemo(
    () => new Set(selectedCommissionIds),
    [selectedCommissionIds],
  );

  const selectedPrioritySet = useMemo(() => new Set(selectedPriorities), [selectedPriorities]);

  const selectedSourceSet = useMemo(() => new Set(selectedSources), [selectedSources]);

  const priorityTriggerLabel = useMemo(() => {
    if (selectedPriorities.length === 0) return "Todas as prioridades";
    if (selectedPriorities.length === 1) return TRIAGE_PRIORITIES[selectedPriorities[0]].label;
    return `${selectedPriorities.length} prioridades`;
  }, [selectedPriorities]);

  const sourceTriggerLabel = useMemo(() => {
    if (selectedSources.length === 0) return "Todas as fontes";
    if (selectedSources.length === 1) {
      return SOURCE_OPTIONS.find((o) => o.id === selectedSources[0])?.label ?? "1 fonte";
    }
    return `${selectedSources.length} fontes`;
  }, [selectedSources]);

  const commissionTriggerLabel = useMemo(() => {
    if (selectedCommissionIds.length === 0) return "Todas as comissões";
    if (selectedCommissionIds.length === 1) {
      const id = selectedCommissionIds[0];
      const entry = commissionCatalog.find((e) => e.commissionId === id);
      return entry?.name ?? "1 comissão";
    }
    return `${selectedCommissionIds.length} comissões`;
  }, [selectedCommissionIds, commissionCatalog]);

  const toggleCommission = (commissionId: string) => {
    setSelectedCommissionIds((prev) => {
      const exists = prev.includes(commissionId);
      const next = exists ? prev.filter((id) => id !== commissionId) : [...prev, commissionId];
      return next.sort((a, b) => {
        const nameA = commissionCatalog.find((c) => c.commissionId === a)?.name ?? a;
        const nameB = commissionCatalog.find((c) => c.commissionId === b)?.name ?? b;
        return nameA.localeCompare(nameB, "pt-BR");
      });
    });
  };

  const togglePriority = (p: TriagePriority) => {
    setSelectedPriorities((prev) => {
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      return sortPriorities(next);
    });
  };

  const toggleSource = (s: KanbanReportSource) => {
    setSelectedSources((prev) => {
      const next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      return sortSources(next);
    });
  };

  const clearCommissionFilter = () => setSelectedCommissionIds([]);
  const clearPriorityFilter = () => setSelectedPriorities([]);
  const clearSourceFilter = () => setSelectedSources([]);

  // HU-13.2 — Mede tempo de carga do kanban (SLA 3s).
  usePerformanceMark("triage_kanban_load", !isLoading && totalItems >= 0);

  const stats = useMemo(() => {
    const all = Object.values(itemsByStatus).flat();
    const untriaged = itemsByStatus.untriaged.length;
    const p0Open = all.filter(
      (i) => i.priority === "P0" && i.triageStatus !== "resolved" && i.triageStatus !== "closed",
    ).length;
    const noCommission = all.filter(
      (i) => !i.commissionId && i.triageStatus !== "resolved" && i.triageStatus !== "closed",
    ).length;
    const stale = all.filter(
      (i) =>
        i.daysSinceTriageUpdate >= 7 &&
        i.triageStatus !== "resolved" &&
        i.triageStatus !== "closed",
    ).length;
    return { untriaged, p0Open, noCommission, stale };
  }, [itemsByStatus]);

  const moveTo = async (item: KanbanItem, targetStatus: TriageStatus) => {
    try {
      const tableSource = item.source === "urban" ? "urban_reports" : "transport_reports";

      // Upsert direto via Supabase: como o card pode vir sem triage ainda,
      // precisamos garantir source_table+report_id + novo status.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const payload: Record<string, unknown> = {
        source_table: tableSource,
        report_id: item.reportId,
        triage_status: targetStatus,
      };
      if (!item.triageId) {
        payload.triaged_by = userId;
        payload.triaged_at = new Date().toISOString();
      }
      const { error: upErr } = await supabase
        .from("report_triage")
        .upsert(payload, { onConflict: "source_table,report_id" });
      if (upErr) throw upErr;

      // Append evento timeline (best-effort).
      try {
        await supabase.from("report_status_events").insert({
          source_table: tableSource,
          report_id: item.reportId,
          event_type: "status_changed",
          event_data: { from: item.triageStatus, to: targetStatus },
          actor_id: userId,
        });
      } catch (_) {
        // não-fatal
      }

      toast.success(`Movido para "${TRIAGE_STATUSES[targetStatus].label}".`);
      void refresh();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível mover: ${msg}`);
    }
  };

  return (
    <PageShell
      title="Triagem de relatos"
      titleInfo="Quadro kanban — prioridade, comissão temática e status do funil (HU-10.3). Clique em um card para abrir o detalhe completo."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/reports">Gestão de relatos</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Atribua prioridade e comissão responsável, avance o status conforme o ciclo de vida do
            atendimento. Os dados vêm de{" "}
            <code className="rounded bg-muted px-1 text-xs">report_triage</code> e dos relatos
            urbanos/transporte.
          </p>
          <AnalyticsLiveBadge
            lastUpdates={[lastUpdate]}
            onRefresh={() => void refresh()}
            refreshing={isLoading}
          />
        </div>

        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="A triar"
            subtitle="Aguardando avaliação"
            value={stats.untriaged}
            icon={Inbox}
            className={stats.untriaged > 0 ? "border-blue-500/30" : undefined}
          />
          <KPICard
            title="P0 abertos"
            subtitle={`Prioridade ${TRIAGE_PRIORITIES.P0.shortLabel} — em aberto`}
            value={stats.p0Open}
            icon={AlertTriangle}
            className={stats.p0Open > 0 ? "border-destructive/40" : undefined}
          />
          <KPICard
            title="Sem comissão"
            subtitle="Sem encaminhamento temático"
            value={stats.noCommission}
            icon={Building2}
            className={stats.noCommission > 0 ? "border-amber-500/30" : undefined}
          />
          <KPICard
            title="Estagnados (≥7d)"
            value={stats.stale}
            icon={AlertCircle}
            className={stats.stale > 0 ? "border-amber-500/30" : undefined}
          />
        </div>

        {/* Filtros */}
        <Card className="p-3 flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar título, protocolo, comissão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Popover open={priorityPopoverOpen} onOpenChange={setPriorityPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-[200px] justify-between gap-1 font-normal",
                  selectedPriorities.length > 0 && "border-primary/60",
                )}
                aria-label="Filtrar por prioridade"
              >
                <span className="truncate text-left">{priorityTriggerLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-foreground">Prioridade</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Marque uma ou mais (P0–P3). Relatos sem prioridade inferida ficam de fora ao
                  filtrar.
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {TRIAGE_PRIORITY_ORDER.map((p) => {
                  const checked = selectedPrioritySet.has(p);
                  return (
                    <label
                      key={p}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/80"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          if (v === "indeterminate") return;
                          if (Boolean(v) !== checked) togglePriority(p);
                        }}
                        aria-labelledby={`priority-opt-${p}`}
                      />
                      <span id={`priority-opt-${p}`} className="truncate">
                        {TRIAGE_PRIORITIES[p].label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedPriorities.length > 0 && (
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      clearPriorityFilter();
                      setPriorityPopoverOpen(false);
                    }}
                  >
                    Limpar filtro (todas)
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Popover open={commissionPopoverOpen} onOpenChange={setCommissionPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-[200px] justify-between gap-1 font-normal",
                  selectedCommissionIds.length > 0 && "border-primary/60",
                )}
                aria-label="Filtrar por comissão temática"
              >
                <span className="truncate text-left">{commissionTriggerLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-foreground">Comissão temática</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Marque uma ou mais comissões. Exibe relatos encaminhados a elas.
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {commissionCatalog.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                    Nenhuma comissão cadastrada.
                  </p>
                ) : (
                  commissionCatalog.map((c) => {
                    const checked = selectedCommissionSet.has(c.commissionId);
                    return (
                      <label
                        key={c.commissionId}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/80"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            if (Boolean(v) !== checked) toggleCommission(c.commissionId);
                          }}
                          aria-labelledby={`commission-opt-${c.commissionId}`}
                        />
                        <span id={`commission-opt-${c.commissionId}`} className="truncate">
                          {c.name}
                          {c.code ? (
                            <span className="text-muted-foreground"> ({c.code})</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedCommissionIds.length > 0 && (
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      clearCommissionFilter();
                      setCommissionPopoverOpen(false);
                    }}
                  >
                    Limpar filtro (todas)
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Popover open={sourcePopoverOpen} onOpenChange={setSourcePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-[200px] justify-between gap-1 font-normal",
                  selectedSources.length > 0 && "border-primary/60",
                )}
                aria-label="Filtrar por fonte do relato"
              >
                <span className="truncate text-left">{sourceTriggerLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-foreground">Fonte</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Marque urbano, transporte ou ambos.
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {SOURCE_OPTIONS.map((o) => {
                  const checked = selectedSourceSet.has(o.id);
                  return (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/80"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          if (v === "indeterminate") return;
                          if (Boolean(v) !== checked) toggleSource(o.id);
                        }}
                        aria-labelledby={`source-opt-${o.id}`}
                      />
                      <span id={`source-opt-${o.id}`} className="truncate">
                        {o.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedSources.length > 0 && (
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      clearSourceFilter();
                      setSourcePopoverOpen(false);
                    }}
                  >
                    Limpar filtro (todas)
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground md:ml-auto">
            {totalItems} relato{totalItems === 1 ? "" : "s"}
          </span>
        </Card>

        {/* Kanban */}
        <TriageKanban data={{ itemsByStatus, totalItems }} onMoveTo={moveTo} />
      </div>
    </PageShell>
  );
}
