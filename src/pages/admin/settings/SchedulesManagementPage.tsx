import { useMemo, useState } from "react";
import {
  CalendarClock,
  Copy,
  Edit2,
  History,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useScheduledExports,
  type ScheduledExport,
} from "@/hooks/useScheduledExports";
import { ScheduleEditorDialog } from "@/components/admin/ScheduleEditorDialog";
import { ScheduleExecutionsDialog } from "@/components/admin/ScheduleExecutionsDialog";
import {
  RELATIVE_PERIOD_LABELS,
  formatPeriodPtBr,
  resolveRelativePeriod,
} from "@/lib/relativePeriod";
import { cn } from "@/lib/utils";

/**
 * HU-8.1 — Página de gerenciamento de agendamentos de exportação.
 *
 * Lista todos os agendamentos do gestor com ações inline (pausar/retomar,
 * editar, duplicar, excluir, histórico de execuções).
 */

const WEEKDAY_LABELS: Record<number, string> = {
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sáb",
  7: "dom",
};

function formatRecurrence(s: ScheduledExport): string {
  const time = `${String(s.runHour).padStart(2, "0")}:${String(s.runMinute).padStart(2, "0")}`;
  if (s.recurrence === "daily") return `Diariamente às ${time}`;
  if (s.recurrence === "weekly") {
    const w = s.weekday ? WEEKDAY_LABELS[s.weekday] : "?";
    return `Toda ${w} às ${time}`;
  }
  return `Todo dia ${String(s.monthday ?? 1).padStart(2, "0")} às ${time}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function SchedulesManagementPage() {
  const { schedules, isLoading, update, remove, toggle, create } = useScheduledExports();
  const [editTarget, setEditTarget] = useState<ScheduledExport | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [executionsTarget, setExecutionsTarget] = useState<ScheduledExport | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ScheduledExport | null>(null);

  const handleDuplicate = async (s: ScheduledExport) => {
    const base = s.name;
    let newName = `${base} (cópia)`;
    let n = 2;
    while (
      schedules.find(
        (other) =>
          other.name.localeCompare(newName, "pt-BR", { sensitivity: "base" }) === 0,
      )
    ) {
      newName = `${base} (cópia ${n})`;
      n += 1;
      if (n > 50) break;
    }
    const created = await create({
      name: newName,
      dataset: s.dataset,
      format: s.format,
      fieldIds: s.fields,
      orderBy: s.orderBy,
      filters: s.filters,
      includeSummary: s.includeSummary,
      recurrence: s.recurrence,
      runHour: s.runHour,
      runMinute: s.runMinute,
      weekday: s.weekday ?? undefined,
      monthday: s.monthday ?? undefined,
      periodKind: s.periodKind,
      periodRelative: s.periodRelative ?? undefined,
      notifyInApp: s.notifyInApp,
    });
    if (created) toast.success(`Duplicado como "${created.name}".`);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const name = confirmDelete.name;
    await remove(confirmDelete.id);
    setConfirmDelete(null);
    toast.success(`Agendamento "${name}" excluído.`);
  };

  const sortedSchedules = useMemo(() => schedules, [schedules]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agendamentos</h1>
            <p className="text-muted-foreground">
              Exportações periódicas configuradas. O cron dispara cada uma na frequência
              definida e os arquivos ficam disponíveis em "Minhas exportações".
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo agendamento
          </Button>
        </div>

        {isLoading && schedules.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Carregando...</Card>
        ) : sortedSchedules.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Você ainda não tem agendamentos. Crie um para receber exportações
              periodicamente.
            </p>
            <Button onClick={() => setCreateOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro agendamento
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedSchedules.map((s) => (
              <ScheduleRow
                key={s.id}
                schedule={s}
                onToggle={() => void toggle(s.id, !s.enabled)}
                onEdit={() => setEditTarget(s)}
                onDuplicate={() => void handleDuplicate(s)}
                onDelete={() => setConfirmDelete(s)}
                onHistory={() => setExecutionsTarget(s)}
              />
            ))}
          </div>
        )}

        {/* Dialog de criar/editar — reusa o ScheduleEditorDialog, que é uma
            versão estendida (sem snapshot externo, com inputs próprios). */}
        <ScheduleEditorDialog
          open={createOpen || !!editTarget}
          onOpenChange={(v) => {
            if (!v) {
              setCreateOpen(false);
              setEditTarget(null);
            }
          }}
          target={editTarget}
        />

        {/* Histórico de execuções */}
        <ScheduleExecutionsDialog
          schedule={executionsTarget}
          onOpenChange={(v) => !v && setExecutionsTarget(null)}
        />

        {/* Confirmação de exclusão */}
        <AlertDialog
          open={confirmDelete !== null}
          onOpenChange={(v) => !v && setConfirmDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
              <AlertDialogDescription>
                O agendamento <strong>"{confirmDelete?.name}"</strong> será removido
                permanentemente. As execuções anteriores ficam preservadas em
                "Minhas exportações".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleConfirmDelete()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

interface ScheduleRowProps {
  schedule: ScheduledExport;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onHistory: () => void;
}

function ScheduleRow({
  schedule,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onHistory,
}: ScheduleRowProps) {
  const datasetLabel =
    schedule.dataset === "urban_reports"
      ? "Relatos urbanos"
      : schedule.dataset === "transport_reports"
        ? "Relatos de transporte"
        : schedule.dataset;

  const periodPreview = useMemo(() => {
    if (schedule.periodKind === "relative" && schedule.periodRelative) {
      const p = resolveRelativePeriod(schedule.periodRelative);
      return `${RELATIVE_PERIOD_LABELS[schedule.periodRelative]} (${formatPeriodPtBr(p)})`;
    }
    return "Janela fixa";
  }, [schedule.periodKind, schedule.periodRelative]);

  return (
    <Card className={cn("p-4", !schedule.enabled && "opacity-60")}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{schedule.name}</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {schedule.format.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {datasetLabel}
            </Badge>
            {!schedule.enabled && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-500/50 text-amber-600">
                Pausado
              </Badge>
            )}
            {schedule.notifyInApp && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                🔔 Notifica
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatRecurrence(schedule)} · {schedule.fields.length} campos · {periodPreview}
          </div>
          <div className="text-[11px] text-muted-foreground/80">
            Próx. execução: <span className="font-medium">{formatDateTime(schedule.nextRunAt)}</span>
            {schedule.lastRunAt && (
              <>
                {" · "}Última: {formatDateTime(schedule.lastRunAt)}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onToggle}
            title={schedule.enabled ? "Pausar" : "Retomar"}
          >
            {schedule.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onHistory}
            title="Ver histórico de execuções"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onEdit}
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onDuplicate}
            title="Duplicar"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
