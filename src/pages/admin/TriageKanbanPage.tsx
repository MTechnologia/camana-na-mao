import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Inbox,
  Search,
  UserX,
} from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { KPICard } from "@/components/analytics/KPICard";
import { TriageKanban } from "@/components/admin/triage/TriageKanban";
import {
  useTriageKanban,
  type KanbanItem,
  type KanbanReportSource,
} from "@/hooks/useTriageKanban";
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
 * filtros (prioridades, responsáveis, fontes — multi-seleção), busca, board com 4 colunas,
 * drill-through para o ReportDetailSheet.
 */

type AssigneeCatalogEntry = { userId: string; fullName: string };

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
  /** Vazio = todas as prioridades. */
  const [selectedPriorities, setSelectedPriorities] = useState<TriagePriority[]>([]);
  /** Vazio = sem filtro (todos os responsáveis). */
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [assigneeCatalog, setAssigneeCatalog] = useState<AssigneeCatalogEntry[]>([]);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);
  /** Vazio = todas as fontes. */
  const [selectedSources, setSelectedSources] = useState<KanbanReportSource[]>([]);
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      priorities: selectedPriorities.length === 0 ? undefined : selectedPriorities,
      assigneeIds: selectedAssigneeIds.length === 0 ? undefined : selectedAssigneeIds,
      sources: selectedSources.length === 0 ? undefined : selectedSources,
      search,
    }),
    [selectedPriorities, selectedAssigneeIds, selectedSources, search],
  );

  const {
    itemsByStatus,
    totalItems,
    isLoading,
    error,
    lastUpdate,
    refresh,
  } = useTriageKanban(filters);

  /** Acumula nomes já vistos no board para o popover não “encolher” quando há filtro ativo. */
  useEffect(() => {
    setAssigneeCatalog((prev) => {
      const map = new Map(prev.map((e) => [e.userId, e.fullName]));
      for (const col of Object.values(itemsByStatus)) {
        for (const it of col) {
          if (it.assigneeId) {
            const label =
              it.assigneeName?.trim() || map.get(it.assigneeId) || "Responsável";
            map.set(it.assigneeId, label);
          }
          if (it.triagedById) {
            const label =
              it.triagedByName?.trim() || map.get(it.triagedById) || "Triagem";
            map.set(it.triagedById, label);
          }
        }
      }
      return [...map.entries()]
        .map(([userId, fullName]) => ({ userId, fullName }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
    });
  }, [itemsByStatus]);

  const selectedAssigneeSet = useMemo(
    () => new Set(selectedAssigneeIds.map((id) => id.toLowerCase())),
    [selectedAssigneeIds],
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

  const assigneeTriggerLabel = useMemo(() => {
    if (selectedAssigneeIds.length === 0) return "Todos os responsáveis";
    if (selectedAssigneeIds.length === 1) {
      const id = selectedAssigneeIds[0];
      const entry = assigneeCatalog.find((e) => e.userId === id);
      return entry?.fullName ?? "1 responsável";
    }
    return `${selectedAssigneeIds.length} responsáveis`;
  }, [selectedAssigneeIds, assigneeCatalog]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) => {
      const lower = userId.toLowerCase();
      const exists = prev.some((id) => id.toLowerCase() === lower);
      const next = exists ? prev.filter((id) => id.toLowerCase() !== lower) : [...prev, userId];
      return next.sort((a, b) => a.localeCompare(b));
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

  const clearAssigneeFilter = () => setSelectedAssigneeIds([]);
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
    const noAssignee = all.filter(
      (i) =>
        !i.assigneeId
        && i.triageStatus !== "resolved"
        && i.triageStatus !== "closed",
    ).length;
    const stale = all.filter(
      (i) =>
        i.daysSinceTriageUpdate >= 7
        && i.triageStatus !== "resolved"
        && i.triageStatus !== "closed",
    ).length;
    return { untriaged, p0Open, noAssignee, stale };
  }, [itemsByStatus]);

  const moveTo = async (item: KanbanItem, targetStatus: TriageStatus) => {
    try {
      const tableSource =
        item.source === "urban" ? "urban_reports" : "transport_reports";

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
      titleInfo="Quadro kanban — prioridade, responsável e status do funil (HU-10.3). Clique em um card para abrir o detalhe completo."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/reports">Gestão de relatos</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Atribua prioridade e responsável, avance o status conforme o ciclo de vida do atendimento.
            Os dados vêm de <code className="rounded bg-muted px-1 text-xs">report_triage</code> e dos relatos
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
            title="Sem responsável"
            value={stats.noAssignee}
            icon={UserX}
            className={stats.noAssignee > 0 ? "border-amber-500/30" : undefined}
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
              placeholder="Buscar título, protocolo, responsável..."
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
                  Marque uma ou mais (P0–P3). Relatos sem prioridade inferida ficam de fora ao filtrar.
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
          <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-[200px] justify-between gap-1 font-normal",
                  selectedAssigneeIds.length > 0 && "border-primary/60",
                )}
                aria-label="Filtrar por responsável ou quem triou"
              >
                <span className="truncate text-left">{assigneeTriggerLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-foreground">Responsável / triagem</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Marque uma ou mais pessoas. Relatos em que ela é responsável ou registrou a triagem.
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {assigneeCatalog.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                    Nenhum nome nesta carga ainda.
                  </p>
                ) : (
                  assigneeCatalog.map((a) => {
                    const checked = selectedAssigneeSet.has(a.userId.toLowerCase());
                    return (
                      <label
                        key={a.userId}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/80"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            if (v === "indeterminate") return;
                            if (Boolean(v) !== checked) toggleAssignee(a.userId);
                          }}
                          aria-labelledby={`assignee-opt-${a.userId}`}
                        />
                        <span id={`assignee-opt-${a.userId}`} className="truncate">
                          {a.fullName}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedAssigneeIds.length > 0 && (
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      clearAssigneeFilter();
                      setAssigneePopoverOpen(false);
                    }}
                  >
                    Limpar filtro (mostrar todos)
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
        <TriageKanban
          data={{ itemsByStatus, totalItems }}
          onMoveTo={moveTo}
        />
      </div>
    </PageShell>
  );
}
