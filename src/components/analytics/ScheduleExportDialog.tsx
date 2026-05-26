import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useScheduledExports,
  type Recurrence,
  type PeriodKind,
} from "@/hooks/useScheduledExports";
import type { ExportDataset } from "@/lib/exportFields";
import {
  RELATIVE_PERIOD_OPTIONS,
  resolveRelativePeriod,
  formatPeriodPtBr,
  type RelativePeriodKind,
} from "@/lib/relativePeriod";

/**
 * HU-7.4 — Modal "Agendar exportação".
 *
 * Recebe a configuração atual do DataExportDialog (dataset, formato, campos,
 * ordenação, filtros, includeSummary) e permite ao gestor salvar como um
 * agendamento periódico. Validações:
 *  - Nome obrigatório e único por usuário.
 *  - Recurrence weekly exige weekday; monthly exige monthday.
 */

interface ScheduleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultConfig: {
    dataset: ExportDataset;
    format: "csv" | "xlsx";
    fieldIds: string[];
    orderBy: { fieldId: string; direction: "asc" | "desc" };
    filters?: Record<string, unknown>;
    includeSummary?: boolean;
  };
}

const WEEKDAYS = [
  { id: 1, label: "Segunda" },
  { id: 2, label: "Terça" },
  { id: 3, label: "Quarta" },
  { id: 4, label: "Quinta" },
  { id: 5, label: "Sexta" },
  { id: 6, label: "Sábado" },
  { id: 7, label: "Domingo" },
];

export function ScheduleExportDialog({
  open,
  onOpenChange,
  defaultConfig,
}: ScheduleExportDialogProps) {
  const { schedules, create } = useScheduledExports();

  const [name, setName] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [runHour, setRunHour] = useState(7);
  const [runMinute, setRunMinute] = useState(0);
  const [weekday, setWeekday] = useState(1);
  const [monthday, setMonthday] = useState(1);
  // HU-8.1 — período relativo + notificação in-app
  const [periodKind, setPeriodKind] = useState<PeriodKind>("relative");
  const [periodRelative, setPeriodRelative] = useState<RelativePeriodKind>("last_7d");
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setRecurrence("daily");
      setRunHour(7);
      setRunMinute(0);
      setWeekday(1);
      setMonthday(1);
      setPeriodKind("relative");
      setPeriodRelative("last_7d");
      setNotifyInApp(true);
      setBusy(false);
    }
  }, [open]);

  // HU-8.1 — Preview do intervalo que será aplicado quando a próxima execução
  // disparar. Mostra ao gestor o que esperar.
  const previewPeriod = useMemo(() => {
    if (periodKind !== "relative") return null;
    const p = resolveRelativePeriod(periodRelative, new Date());
    return formatPeriodPtBr(p);
  }, [periodKind, periodRelative]);

  const nameTrimmed = name.trim();
  const nameError = useMemo<string | null>(() => {
    if (!nameTrimmed) return null;
    if (nameTrimmed.length > 80) return "Use até 80 caracteres.";
    const dup = schedules.find(
      (s) =>
        s.name.localeCompare(nameTrimmed, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (dup) return "Já existe um agendamento com este nome.";
    return null;
  }, [nameTrimmed, schedules]);

  const canSubmit = nameTrimmed.length > 0 && !nameError && !busy;

  const handleSave = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const created = await create({
      name: nameTrimmed,
      dataset: defaultConfig.dataset,
      format: defaultConfig.format,
      fieldIds: defaultConfig.fieldIds,
      orderBy: defaultConfig.orderBy,
      filters: defaultConfig.filters,
      includeSummary: defaultConfig.includeSummary,
      recurrence,
      runHour,
      runMinute,
      weekday: recurrence === "weekly" ? weekday : undefined,
      monthday: recurrence === "monthly" ? monthday : undefined,
      // HU-8.1
      periodKind,
      periodRelative: periodKind === "relative" ? periodRelative : undefined,
      notifyInApp,
    });
    setBusy(false);
    if (created) {
      const nextRun = new Date(created.nextRunAt);
      toast.success(
        `Agendado "${created.name}". Próxima execução: ${nextRun.toLocaleString("pt-BR")}.`,
      );
      onOpenChange(false);
    } else {
      toast.error("Não foi possível salvar o agendamento.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 text-left">
          <DialogTitle>Agendar exportação</DialogTitle>
          <DialogDescription>
            Vamos rodar este export periodicamente e salvar o arquivo no seu painel
            "Minhas exportações".
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Nome do agendamento</Label>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ex.: "Relatos urbanos - semanal"'
              maxLength={80}
              autoFocus
              disabled={busy}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Frequência</Label>
            <RadioGroup
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as Recurrence)}
              className="grid grid-cols-3 gap-2"
            >
              {(["daily", "weekly", "monthly"] as Recurrence[]).map((r) => (
                <Label
                  key={r}
                  htmlFor={`rec-${r}`}
                  className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
                >
                  <RadioGroupItem value={r} id={`rec-${r}`} />
                  <span className="text-sm capitalize">
                    {r === "daily" ? "Diário" : r === "weekly" ? "Semanal" : "Mensal"}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {recurrence === "weekly" && (
            <div className="space-y-2">
              <Label className="text-sm">Dia da semana</Label>
              <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {recurrence === "monthly" && (
            <div className="space-y-2">
              <Label className="text-sm">Dia do mês</Label>
              <Select value={String(monthday)} onValueChange={(v) => setMonthday(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {String(d).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Em meses sem o dia escolhido, executa no último dia disponível.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-sm">Hora</Label>
              <Select value={String(runHour)} onValueChange={(v) => setRunHour(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Minuto</Label>
              <Select value={String(runMinute)} onValueChange={(v) => setRunMinute(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 15, 30, 45].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      :{String(m).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* HU-8.1 — Período relativo vs fixo */}
          <div className="space-y-2">
            <Label className="text-sm">Período dos dados</Label>
            <RadioGroup
              value={periodKind}
              onValueChange={(v) => setPeriodKind(v as PeriodKind)}
              className="grid grid-cols-2 gap-2"
            >
              <Label
                htmlFor="period-relative"
                className="flex items-start gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
              >
                <RadioGroupItem value="relative" id="period-relative" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Dinâmico</div>
                  <div className="text-xs text-muted-foreground">
                    Recalcula a cada execução
                  </div>
                </div>
              </Label>
              <Label
                htmlFor="period-fixed"
                className="flex items-start gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
              >
                <RadioGroupItem value="fixed" id="period-fixed" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Fixo</div>
                  <div className="text-xs text-muted-foreground">
                    Mesmo intervalo todas as vezes
                  </div>
                </div>
              </Label>
            </RadioGroup>

            {periodKind === "relative" && (
              <div className="space-y-1">
                <Select
                  value={periodRelative}
                  onValueChange={(v) => setPeriodRelative(v as RelativePeriodKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIVE_PERIOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {previewPeriod && (
                  <p className="text-xs text-muted-foreground">
                    Se executasse agora: <span className="font-medium">{previewPeriod}</span>
                  </p>
                )}
              </div>
            )}
            {periodKind === "fixed" && (
              <p className="text-xs text-muted-foreground">
                Mantém as datas do export atual ({defaultConfig.filters?.startDate
                  ? "início e fim definidos"
                  : "todo o histórico"}).
              </p>
            )}
          </div>

          {/* HU-8.1 — Notificação in-app */}
          <Label
            htmlFor="notify-in-app"
            className="flex items-start gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-muted/50"
          >
            <Checkbox
              id="notify-in-app"
              checked={notifyInApp}
              onCheckedChange={(v) => setNotifyInApp(v === true)}
            />
            <span className="text-sm">
              Receber e-mail e notificação no sino quando o arquivo estiver pronto
              <span className="block text-xs text-muted-foreground">
                Envia o link de download por e-mail e exibe no sino da plataforma.
              </span>
            </span>
          </Label>

          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Configuração capturada:</span>
            </div>
            <div>Dataset: {defaultConfig.dataset === "urban_reports" ? "Relatos urbanos" : "Relatos de transporte"}</div>
            <div>Formato: {defaultConfig.format.toUpperCase()}</div>
            <div>Campos: {defaultConfig.fieldIds.length} selecionados</div>
            <div>
              Ordenação: {defaultConfig.orderBy.fieldId}{" "}
              ({defaultConfig.orderBy.direction === "asc" ? "↑" : "↓"})
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSubmit}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar agendamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
