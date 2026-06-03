import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
  type ScheduledExport,
} from "@/hooks/useScheduledExports";
import {
  DATASET_LIST,
  getBasicPresetFieldIds,
  getDataset,
  filterFieldsByRole,
  type ExportDataset,
} from "@/lib/exportFields";
import { useUserRole } from "@/hooks/useUserRole";
import type { ExportRole } from "@/lib/exportFields";
import { effectiveExportRole } from "@/lib/exportStaffRole";
import {
  RELATIVE_PERIOD_OPTIONS,
  formatPeriodPtBr,
  resolveRelativePeriod,
  type RelativePeriodKind,
} from "@/lib/relativePeriod";

/**
 * HU-8.1 — Editor completo de agendamento, usado pela página de gerenciamento.
 *
 * Diferente do ScheduleExportDialog (que captura snapshot do contexto atual),
 * este dialog tem seus próprios controles para dataset, formato e campos.
 * Suporta CRIAR (target=null) e EDITAR (target=ScheduledExport).
 */

interface ScheduleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ScheduledExport | null;
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

export function ScheduleEditorDialog({ open, onOpenChange, target }: ScheduleEditorDialogProps) {
  const { schedules, create, update } = useScheduledExports();
  const { isAdmin, isGestor, isAssessor, isVereador } = useUserRole();
  const role: ExportRole | null = effectiveExportRole({
    isAdmin,
    isGestor,
    isAssessor,
    isVereador,
  });

  const isEdit = target !== null;
  const [name, setName] = useState("");
  const [dataset, setDataset] = useState<ExportDataset>("urban_reports");
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [runHour, setRunHour] = useState(7);
  const [runMinute, setRunMinute] = useState(0);
  const [weekday, setWeekday] = useState(1);
  const [monthday, setMonthday] = useState(1);
  const [periodKind, setPeriodKind] = useState<PeriodKind>("relative");
  const [periodRelative, setPeriodRelative] = useState<RelativePeriodKind>("last_7d");
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (target) {
      setName(target.name);
      setDataset(target.dataset);
      setFormat(target.format);
      setRecurrence(target.recurrence);
      setRunHour(target.runHour);
      setRunMinute(target.runMinute);
      setWeekday(target.weekday ?? 1);
      setMonthday(target.monthday ?? 1);
      setPeriodKind(target.periodKind);
      setPeriodRelative(target.periodRelative ?? "last_7d");
      setNotifyInApp(target.notifyInApp);
    } else {
      setName("");
      setDataset("urban_reports");
      setFormat("csv");
      setRecurrence("daily");
      setRunHour(7);
      setRunMinute(0);
      setWeekday(1);
      setMonthday(1);
      setPeriodKind("relative");
      setPeriodRelative("last_7d");
      setNotifyInApp(true);
    }
    setBusy(false);
  }, [open, target]);

  const nameTrimmed = name.trim();
  const nameError = useMemo<string | null>(() => {
    if (!nameTrimmed) return null;
    if (nameTrimmed.length > 80) return "Use até 80 caracteres.";
    const dup = schedules.find(
      (s) =>
        s.id !== target?.id &&
        s.name.localeCompare(nameTrimmed, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (dup) return "Já existe um agendamento com este nome.";
    return null;
  }, [nameTrimmed, schedules, target]);

  const canSubmit = nameTrimmed.length > 0 && !nameError && !busy;

  const previewPeriod = useMemo(() => {
    if (periodKind !== "relative") return null;
    return formatPeriodPtBr(resolveRelativePeriod(periodRelative));
  }, [periodKind, periodRelative]);

  const handleSave = async () => {
    if (!canSubmit) return;
    setBusy(true);

    // Campos default: presets "Básicos" filtrados pela role (governança HU-7.3).
    const dsMeta = getDataset(dataset);
    const visible = filterFieldsByRole(dsMeta.fields, role);
    const visibleIds = new Set(visible.map((f) => f.id));
    const fieldIds = getBasicPresetFieldIds(dsMeta).filter((id) => visibleIds.has(id));

    if (isEdit && target) {
      await update(target.id, {
        name: nameTrimmed,
        recurrence,
        runHour,
        runMinute,
        weekday: recurrence === "weekly" ? weekday : null,
        monthday: recurrence === "monthly" ? monthday : null,
        periodKind,
        periodRelative: periodKind === "relative" ? periodRelative : null,
        notifyInApp,
      });
      toast.success(`Agendamento "${nameTrimmed}" atualizado.`);
    } else {
      const created = await create({
        name: nameTrimmed,
        dataset,
        format,
        fieldIds,
        orderBy: { fieldId: dsMeta.defaultOrderColumn, direction: "desc" },
        filters: {},
        includeSummary: format === "xlsx",
        recurrence,
        runHour,
        runMinute,
        weekday: recurrence === "weekly" ? weekday : undefined,
        monthday: recurrence === "monthly" ? monthday : undefined,
        periodKind,
        periodRelative: periodKind === "relative" ? periodRelative : undefined,
        notifyInApp,
      });
      if (created) toast.success(`Agendamento "${created.name}" criado.`);
      else toast.error("Não foi possível criar o agendamento.");
    }
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste a frequência, o período e a notificação."
              : "Configure um export periódico que será disparado automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ed-name">Nome</Label>
            <Input
              id="ed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ex.: "Relatos urbanos - semanal"'
              maxLength={80}
              disabled={busy}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label>Dataset</Label>
                <RadioGroup
                  value={dataset}
                  onValueChange={(v) => setDataset(v as ExportDataset)}
                  className="grid grid-cols-2 gap-2"
                >
                  {DATASET_LIST.map((d) => (
                    <Label
                      key={d.id}
                      htmlFor={`ed-ds-${d.id}`}
                      className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04] text-sm"
                    >
                      <RadioGroupItem value={d.id} id={`ed-ds-${d.id}`} />
                      <span>{d.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as "csv" | "xlsx")}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label
                    htmlFor="ed-fmt-csv"
                    className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04] text-sm"
                  >
                    <RadioGroupItem value="csv" id="ed-fmt-csv" />
                    CSV (.csv)
                  </Label>
                  <Label
                    htmlFor="ed-fmt-xlsx"
                    className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04] text-sm"
                  >
                    <RadioGroupItem value="xlsx" id="ed-fmt-xlsx" />
                    Excel (.xlsx)
                  </Label>
                </RadioGroup>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Novos agendamentos começam com os campos do preset "Básicos" do dataset. Para
                selecionar campos específicos, abra um export manual e use "Agendar" lá.
              </p>
            </>
          )}

          <div className="space-y-2">
            <Label>Frequência</Label>
            <RadioGroup
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as Recurrence)}
              className="grid grid-cols-3 gap-2"
            >
              {(["daily", "weekly", "monthly"] as Recurrence[]).map((r) => (
                <Label
                  key={r}
                  htmlFor={`ed-rec-${r}`}
                  className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04] text-sm"
                >
                  <RadioGroupItem value={r} id={`ed-rec-${r}`} />
                  {r === "daily" ? "Diário" : r === "weekly" ? "Semanal" : "Mensal"}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {recurrence === "weekly" && (
            <div className="space-y-2">
              <Label>Dia da semana</Label>
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
              <Label>Dia do mês</Label>
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
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Hora</Label>
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
              <Label>Minuto</Label>
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

          <div className="space-y-2">
            <Label>Período dos dados</Label>
            <RadioGroup
              value={periodKind}
              onValueChange={(v) => setPeriodKind(v as PeriodKind)}
              className="grid grid-cols-2 gap-2"
            >
              <Label
                htmlFor="ed-pk-rel"
                className="flex items-start gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
              >
                <RadioGroupItem value="relative" id="ed-pk-rel" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Dinâmico</div>
                  <div className="text-xs text-muted-foreground">Recalcula a cada execução</div>
                </div>
              </Label>
              <Label
                htmlFor="ed-pk-fixed"
                className="flex items-start gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
              >
                <RadioGroupItem value="fixed" id="ed-pk-fixed" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Fixo</div>
                  <div className="text-xs text-muted-foreground">Sem período (todo histórico)</div>
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
          </div>

          <Label
            htmlFor="ed-notify"
            className="flex items-start gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-muted/50"
          >
            <Checkbox
              id="ed-notify"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSubmit}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : isEdit ? (
              "Salvar alterações"
            ) : (
              "Criar agendamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
