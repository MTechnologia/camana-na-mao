import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  Inbox,
  Search,
  UserX,
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { KPICard } from "@/components/analytics/KPICard";
import { TriageKanban } from "@/components/admin/triage/TriageKanban";
import {
  useTriageKanban,
  type KanbanItem,
} from "@/hooks/useTriageKanban";
import { usePerformanceMark } from "@/hooks/usePerformanceMark";
import {
  useTriageAssignees,
} from "@/hooks/useReportTriage";
import { supabase } from "@/integrations/supabase/client";
import {
  TRIAGE_PRIORITIES,
  TRIAGE_PRIORITY_ORDER,
  TRIAGE_STATUSES,
  type TriagePriority,
  type TriageStatus,
} from "@/lib/triage";

/**
 * HU-10.3 — Página /admin/triagem.
 *
 * Kanban estilo de triagem dos relatos abertos. KPIs no topo,
 * filtros (prioridade, responsável, fonte, busca), board com 4 colunas,
 * drill-through para o ReportDetailSheet.
 */

const ALL_ASSIGNEES = "__all__";

export default function TriageKanbanPage() {
  const [priorityFilter, setPriorityFilter] = useState<TriagePriority | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL_ASSIGNEES);
  const [sourceFilter, setSourceFilter] = useState<"all" | "urban" | "transport">("all");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      priorities: priorityFilter === "all" ? undefined : [priorityFilter],
      assigneeIds: assigneeFilter === ALL_ASSIGNEES ? undefined : [assigneeFilter],
      sources: sourceFilter === "all" ? undefined : [sourceFilter],
      search,
    }),
    [priorityFilter, assigneeFilter, sourceFilter, search],
  );

  const {
    itemsByStatus,
    totalItems,
    isLoading,
    error,
    lastUpdate,
    refresh,
  } = useTriageKanban(filters);
  const { assignees } = useTriageAssignees();

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
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Triagem de relatos
            </h1>
            <p className="text-muted-foreground">
              Atribua prioridade e responsável, avance o status conforme
              o ciclo de vida do atendimento. Clique no card para abrir os
              detalhes completos.
            </p>
          </div>
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
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TriagePriority | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {TRIAGE_PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {TRIAGE_PRIORITIES[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ASSIGNEES}>Todos os responsáveis</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.userId} value={a.userId}>
                  {a.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fontes</SelectItem>
              <SelectItem value="urban">Urbano</SelectItem>
              <SelectItem value="transport">Transporte</SelectItem>
            </SelectContent>
          </Select>
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
    </AdminLayout>
  );
}
