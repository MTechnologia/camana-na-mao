import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DATASET_LIST,
  EXPORT_DATASETS,
  filterFieldsByRole,
  getAllFieldIds,
  getBasicPresetFieldIds,
  getDataset,
  getRowCap,
  groupFields,
  type ExportDataset,
  type ExportRole,
} from "@/lib/exportFields";
import { useUserRole } from "@/hooks/useUserRole";
import { effectiveExportRole as resolveStaffExportRole } from "@/lib/exportStaffRole";
import { useCsvExport, CSV_EXPORT_MAX_ROWS, type CsvExportConfig } from "@/hooks/useCsvExport";
import { useXlsxExport, XLSX_EXPORT_MAX_ROWS, type XlsxExportConfig } from "@/hooks/useXlsxExport";
import { ScheduleExportDialog } from "@/components/analytics/ScheduleExportDialog";
import { CalendarClock } from "lucide-react";
import type { DataExportDefaultFilters } from "@/lib/buildDataExportFilters";

/**
 * HU-7.1 + HU-7.2 — Dialog unificado de exportação de dados.
 *
 * Permite ao gestor escolher:
 *  - Formato: CSV (.csv) ou Excel (.xlsx). Quando XLSX, opcionalmente
 *    inclui uma aba "Resumo" com KPIs e breakdowns sobre os dados baixados.
 *  - Escopo: dataset (urban / transport) + chips de filtros herdados.
 *  - Campos: checkboxes agrupados, com presets "Básicos" / "Selecionar tudo".
 *  - Ordenação: campo (entre selecionados) + ASC/DESC.
 *
 * Persiste seleção em localStorage por dataset.
 */

export type ExportFormat = "csv" | "xlsx";

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFilters?: DataExportDefaultFilters;
  defaultDataset?: ExportDataset;
  defaultFormat?: ExportFormat;
}

const LS_FIELDS_KEY = (dataset: ExportDataset) => `cnm:export:fields:${dataset}`;
const LS_ORDER_KEY = (dataset: ExportDataset) => `cnm:export:order:${dataset}`;
const LS_FORMAT_KEY = "cnm:export:format";
const LS_INCLUDE_SUMMARY_KEY = "cnm:export:includeSummary";

function loadStoredFields(dataset: ExportDataset): string[] | null {
  try {
    const raw = localStorage.getItem(LS_FIELDS_KEY(dataset));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

function loadStoredOrder(
  dataset: ExportDataset,
): { fieldId: string; direction: "asc" | "desc" } | null {
  try {
    const raw = localStorage.getItem(LS_ORDER_KEY(dataset));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.fieldId === "string" &&
      (parsed.direction === "asc" || parsed.direction === "desc")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function loadStoredFormat(): ExportFormat | null {
  try {
    const raw = localStorage.getItem(LS_FORMAT_KEY);
    return raw === "csv" || raw === "xlsx" ? raw : null;
  } catch {
    return null;
  }
}

function loadStoredIncludeSummary(): boolean {
  try {
    return localStorage.getItem(LS_INCLUDE_SUMMARY_KEY) === "true";
  } catch {
    return false;
  }
}

export function DataExportDialog({
  open,
  onOpenChange,
  defaultFilters,
  defaultDataset = "urban_reports",
  defaultFormat,
}: DataExportDialogProps) {
  const [datasetId, setDatasetId] = useState<ExportDataset>(defaultDataset);
  const dataset = useMemo(() => getDataset(datasetId), [datasetId]);

  const [format, setFormat] = useState<ExportFormat>(defaultFormat ?? "csv");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [orderFieldId, setOrderFieldId] = useState<string>("created_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");

  const csvExport = useCsvExport();
  const xlsxExport = useXlsxExport();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const exporting = csvExport.exporting || xlsxExport.exporting;
  const progressLoaded = format === "csv" ? csvExport.progressLoaded : xlsxExport.progressLoaded;
  const error = format === "csv" ? csvExport.error : xlsxExport.error;

  // HU-7.3 — Determina a role efetiva (admin tem precedência sobre gestor)
  // e calcula o cap de linhas dinâmico baseado em role+formato.
  const { isAdmin, isGestor, isAssessor, isVereador } = useUserRole();
  const effectiveRole: ExportRole | null = resolveStaffExportRole({
    isAdmin,
    isGestor,
    isAssessor,
    isVereador,
  });
  const roleCap = getRowCap(effectiveRole, format);
  // Hard cap do client (browser tem que aguentar o conjunto em memória).
  // Acima disso, vai pra Edge Function (HU-7.5).
  const clientHardCap = format === "csv" ? CSV_EXPORT_MAX_ROWS : XLSX_EXPORT_MAX_ROWS;
  const maxRows = Math.min(roleCap, clientHardCap);

  // HU-7.3 — Lista de campos visíveis para esta role (esconde campos com
  // `restrictedToRoles` que não inclua a role efetiva).
  const visibleFields = useMemo(
    () => filterFieldsByRole(dataset.fields, effectiveRole),
    [dataset, effectiveRole],
  );
  const visibleFieldIds = useMemo(() => new Set(visibleFields.map((f) => f.id)), [visibleFields]);

  // Recarrega seleção persistida quando dataset/dialog muda.
  useEffect(() => {
    if (!open) return;
    const stored = loadStoredFields(datasetId);
    const fields = stored && stored.length > 0 ? stored : getBasicPresetFieldIds(dataset);
    // HU-7.3 — filtra qualquer field persistido que a role atual não tenha acesso.
    setSelectedFields(fields.filter((id) => visibleFieldIds.has(id)));

    const storedOrder = loadStoredOrder(datasetId);
    if (storedOrder) {
      setOrderFieldId(storedOrder.fieldId);
      setOrderDir(storedOrder.direction);
    } else {
      setOrderFieldId(dataset.defaultOrderColumn);
      setOrderDir("desc");
    }
  }, [open, datasetId, dataset, visibleFieldIds]);

  // Format / includeSummary persistem global (não por dataset).
  useEffect(() => {
    if (!open) return;
    const storedFmt = loadStoredFormat();
    if (storedFmt && !defaultFormat) setFormat(storedFmt);
    setIncludeSummary(loadStoredIncludeSummary());
  }, [open, defaultFormat]);

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId],
    );
  };

  const applyPreset = (preset: "basico" | "completo" | "limpar") => {
    if (preset === "basico") {
      // HU-7.3 — intersecta com os campos visíveis para a role.
      setSelectedFields(getBasicPresetFieldIds(dataset).filter((id) => visibleFieldIds.has(id)));
    } else if (preset === "completo") {
      setSelectedFields(getAllFieldIds(dataset).filter((id) => visibleFieldIds.has(id)));
    } else setSelectedFields([]);
  };

  const orderableFields = useMemo(() => {
    const set = new Set(selectedFields);
    return dataset.fields.filter((f) => set.has(f.id));
  }, [dataset, selectedFields]);

  useEffect(() => {
    if (orderableFields.length > 0 && !orderableFields.find((f) => f.id === orderFieldId)) {
      setOrderFieldId(orderableFields[0].id);
    }
  }, [orderableFields, orderFieldId]);

  const persistChoices = () => {
    try {
      localStorage.setItem(LS_FIELDS_KEY(datasetId), JSON.stringify(selectedFields));
      localStorage.setItem(
        LS_ORDER_KEY(datasetId),
        JSON.stringify({ fieldId: orderFieldId, direction: orderDir }),
      );
      localStorage.setItem(LS_FORMAT_KEY, format);
      localStorage.setItem(LS_INCLUDE_SUMMARY_KEY, String(includeSummary));
    } catch {
      /* ignore quota */
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Selecione ao menos um campo para exportar.");
      return;
    }
    persistChoices();

    try {
      if (format === "csv") {
        const cfg: CsvExportConfig = {
          dataset: datasetId,
          fieldIds: selectedFields,
          orderBy: { fieldId: orderFieldId, direction: orderDir },
          filters: defaultFilters,
        };
        const result = await csvExport.exportCsv(cfg);
        toast.success(
          `CSV exportado — ${result.rowCount.toLocaleString("pt-BR")} linhas em ${result.filename}.`,
        );
      } else {
        const cfg: XlsxExportConfig = {
          dataset: datasetId,
          fieldIds: selectedFields,
          orderBy: { fieldId: orderFieldId, direction: orderDir },
          includeSummary,
          filters: defaultFilters,
        };
        const result = await xlsxExport.exportXlsx(cfg);
        toast.success(
          `XLSX exportado — ${result.rowCount.toLocaleString("pt-BR")} linhas em ${result.filename}.`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      if (msg !== "CANCELLED") {
        toast.error(`Falha ao exportar: ${msg}`);
      }
    }
  };

  /** HU-7.4 — Abre o dialog de agendamento com a config atual. */
  const openSchedule = () => {
    if (selectedFields.length === 0) {
      toast.error("Selecione ao menos um campo para agendar.");
      return;
    }
    persistChoices();
    setScheduleOpen(true);
  };

  // HU-7.3 — agrupa apenas os campos visíveis para a role atual.
  const grouped = useMemo(() => {
    const allGroups = groupFields(dataset);
    return allGroups.map((g) => ({
      group: g.group,
      fields: g.fields.filter((f) => visibleFieldIds.has(f.id)),
    }));
  }, [dataset, visibleFieldIds]);

  const activeFilterChips: string[] = useMemo(() => {
    const chips: string[] = [];
    const f = defaultFilters;
    if (f?.startDate || f?.endDate) chips.push("Período");
    if ((f?.categories?.length ?? 0) > 0) chips.push(`${f!.categories!.length} categoria(s)`);
    if ((f?.regions?.length ?? 0) > 0) chips.push(`${f!.regions!.length} bairro(s)`);
    if ((f?.zones?.length ?? 0) > 0) chips.push(`${f!.zones!.length} zona(s)`);
    if (f?.status) chips.push("Status");
    return chips;
  }, [defaultFilters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar dados</DialogTitle>
          <DialogDescription>
            Escolha formato, conjunto de dados, campos e ordenação. Os filtros ativos na página são
            aplicados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="escopo" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="escopo">Escopo</TabsTrigger>
            <TabsTrigger value="campos">
              Campos
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {selectedFields.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ordenacao">Ordenação</TabsTrigger>
          </TabsList>

          <TabsContent value="escopo" className="space-y-4 pt-4">
            {/* Formato — HU-7.2 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Formato</Label>
              <RadioGroup
                value={format}
                onValueChange={(v) => setFormat(v as ExportFormat)}
                className="grid grid-cols-2 gap-2"
              >
                <Label
                  htmlFor="fmt-csv"
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
                >
                  <RadioGroupItem value="csv" id="fmt-csv" />
                  <div>
                    <div className="text-sm font-medium">CSV (.csv)</div>
                    <div className="text-xs text-muted-foreground">
                      Texto simples; abre em qualquer planilha.
                    </div>
                  </div>
                </Label>
                <Label
                  htmlFor="fmt-xlsx"
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
                >
                  <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                  <div>
                    <div className="text-sm font-medium">Excel (.xlsx)</div>
                    <div className="text-xs text-muted-foreground">
                      Preserva tipos, suporta aba de Resumo.
                    </div>
                  </div>
                </Label>
              </RadioGroup>

              {format === "xlsx" && (
                <Label
                  htmlFor="include-summary"
                  className="flex items-start gap-2 cursor-pointer mt-2 px-2 py-1.5 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    id="include-summary"
                    checked={includeSummary}
                    onCheckedChange={(v) => setIncludeSummary(v === true)}
                  />
                  <span className="text-sm">
                    Incluir aba "Resumo" com KPIs e breakdowns
                    <span className="block text-xs text-muted-foreground">
                      Adiciona uma planilha extra com indicadores agregados sobre os dados
                      exportados.
                    </span>
                  </span>
                </Label>
              )}
            </div>

            {/* Dataset */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dataset</Label>
              <RadioGroup
                value={datasetId}
                onValueChange={(v) => setDatasetId(v as ExportDataset)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {DATASET_LIST.map((d) => (
                  <Label
                    key={d.id}
                    htmlFor={`ds-${d.id}`}
                    className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/[0.04]"
                  >
                    <RadioGroupItem value={d.id} id={`ds-${d.id}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{d.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.fields.length} campos disponíveis
                      </div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Filtros aplicados (herdados da página)
              </div>
              {activeFilterChips.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum filtro ativo — exportará todos os registros (até{" "}
                  {maxRows.toLocaleString("pt-BR")} linhas).
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activeFilterChips.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[11px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="campos" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPreset("basico")}>
                Básicos
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset("completo")}>
                Selecionar tudo
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset("limpar")}>
                Limpar
              </Button>
              <span className="ml-auto text-xs text-muted-foreground self-center">
                {selectedFields.length} / {dataset.fields.length} selecionados
              </span>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {grouped.map(({ group, fields }) => {
                if (fields.length === 0) return null;
                return (
                  <div key={group} className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {fields.map((f) => (
                        <Label
                          key={f.id}
                          htmlFor={`field-${f.id}`}
                          className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-muted/50 text-sm"
                        >
                          <Checkbox
                            id={`field-${f.id}`}
                            checked={selectedFields.includes(f.id)}
                            onCheckedChange={() => toggleField(f.id)}
                          />
                          <span className="flex-1">{f.label}</span>
                        </Label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="ordenacao" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ordenar por</Label>
              {orderableFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Selecione ao menos um campo na aba "Campos" para configurar a ordenação.
                </p>
              ) : (
                <Select value={orderFieldId} onValueChange={setOrderFieldId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderableFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Direção</Label>
              <RadioGroup
                value={orderDir}
                onValueChange={(v) => setOrderDir(v as "asc" | "desc")}
                className="flex gap-4"
              >
                <Label htmlFor="order-asc" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="asc" id="order-asc" />
                  <span className="text-sm">Crescente (A→Z, 0→9, antigo→novo)</span>
                </Label>
                <Label htmlFor="order-desc" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="desc" id="order-desc" />
                  <span className="text-sm">Decrescente (Z→A, 9→0, novo→antigo)</span>
                </Label>
              </RadioGroup>
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {exporting && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              Exportando... {progressLoaded.toLocaleString("pt-BR")} linhas baixadas
              {progressLoaded >= maxRows
                ? ` (limite ${maxRows.toLocaleString("pt-BR")} atingido)`
                : ""}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, (progressLoaded / maxRows) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancelar
          </Button>
          {/* HU-7.4 — Agendar (cria scheduled_export periódico). */}
          <Button
            variant="outline"
            onClick={openSchedule}
            disabled={exporting || selectedFields.length === 0}
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            Agendar
          </Button>
          <Button
            onClick={() => void handleExport()}
            disabled={exporting || selectedFields.length === 0}
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar {format === "csv" ? "CSV" : "XLSX"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* HU-7.4 — Dialog filho com config snapshot. */}
      <ScheduleExportDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultConfig={{
          dataset: datasetId,
          format,
          fieldIds: selectedFields,
          orderBy: { fieldId: orderFieldId, direction: orderDir },
          filters: defaultFilters as Record<string, unknown> | undefined,
          includeSummary,
        }}
      />
    </Dialog>
  );
}

export const DATASETS_AVAILABLE = Object.values(EXPORT_DATASETS).map((d) => d.id);
