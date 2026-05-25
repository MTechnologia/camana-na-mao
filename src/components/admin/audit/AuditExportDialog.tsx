import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Download, Filter, Loader2, Search, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_FILTER_ALL,
  buildAuditLogQueryFilters,
  type AuditExportFilterState,
  type AuditRangePreset,
} from '@/lib/auditExportFilters';
import {
  AUDIT_CSV_COLUMNS,
  AUDIT_COLUMN_LABELS,
  rowsToCsv,
  type AuditCsvRow,
} from '@/lib/auditCsv';
import { downloadCsv } from '@/lib/csvSerialize';

interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFilters: AuditExportFilterState;
  actors: Array<{ userId: string; fullName: string; email: string; logCount: number }>;
  entityTypes: string[];
}

function fmtDateTime(iso: string): string {
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  } catch {
    return iso;
  }
}

export function AuditExportDialog({
  open,
  onOpenChange,
  defaultFilters,
  actors,
  entityTypes,
}: AuditExportDialogProps) {
  const { getAllLogs } = useAuditLog();
  const { toast } = useToast();

  const [filters, setFilters] = useState<AuditExportFilterState>(defaultFilters);
  const [selectedColumns, setSelectedColumns] = useState<Array<keyof AuditCsvRow>>(
    [...AUDIT_CSV_COLUMNS],
  );
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFilters(defaultFilters);
    setSelectedColumns([...AUDIT_CSV_COLUMNS]);
    setExporting(false);
  }, [open, defaultFilters]);

  const actorById = useMemo(() => {
    const map = new Map<string, (typeof actors)[number]>();
    for (const actor of actors) map.set(actor.userId, actor);
    return map;
  }, [actors]);

  const toggleColumn = (col: keyof AuditCsvRow, checked: boolean) => {
    setSelectedColumns((prev) => {
      if (checked) return prev.includes(col) ? prev : [...prev, col];
      const next = prev.filter((c) => c !== col);
      return next.length > 0 ? next : prev;
    });
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'Selecione ao menos uma coluna',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const queryFilters = buildAuditLogQueryFilters(filters);
      const data = (await getAllLogs(queryFilters)) as unknown as AuditLogRow[];
      const logs = data ?? [];

      const q = filters.searchTerm.trim().toLowerCase();
      const filtered = q
        ? logs.filter((log) => {
            const actor = log.user_id ? actorById.get(log.user_id) : null;
            const hay = `${log.action} ${log.entity_type} ${log.entity_id ?? ''} ${actor?.fullName ?? ''} ${actor?.email ?? ''}`.toLowerCase();
            return hay.includes(q);
          })
        : logs;

      const rows: AuditCsvRow[] = filtered.map((log) => {
        const actor = log.user_id ? actorById.get(log.user_id) : null;
        return {
          data_hora: fmtDateTime(log.created_at),
          user_id: log.user_id ?? '',
          usuario: actor?.fullName ?? '',
          email: actor?.email ?? '',
          acao: log.action,
          entidade: log.entity_type,
          entidade_id: log.entity_id ?? '',
          ip: log.ip_address ?? '',
          user_agent: log.user_agent ?? '',
          old_values: log.old_values ?? null,
          new_values: log.new_values ?? null,
        };
      });

      const filename = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      downloadCsv(rowsToCsv(rows, selectedColumns), filename);

      const isStandalonePwa =
        typeof window !== 'undefined' &&
        (window.matchMedia?.('(display-mode: standalone)').matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true);

      toast({
        title: isStandalonePwa ? 'CSV aberto em nova aba' : 'Download iniciado',
        description: isStandalonePwa
          ? `${filtered.length} registros — use o menu do navegador para salvar.`
          : `${filtered.length} registros exportados.`,
      });
      onOpenChange(false);
    } catch {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo CSV.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 text-left">
          <DialogTitle>Exportar logs de auditoria</DialogTitle>
          <DialogDescription>
            Defina os filtros e as colunas do CSV. Os filtros da tela foram pré-preenchidos — ajuste
            se precisar antes de exportar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="export-search">Busca textual</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="export-search"
                placeholder="Ação, entidade, usuário, ID..."
                value={filters.searchTerm}
                onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
                className="pl-9"
                disabled={exporting}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select
                value={filters.rangePreset}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, rangePreset: v as AuditRangePreset }))
                }
                disabled={exporting}
              >
                <SelectTrigger>
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="custom">Personalizado...</SelectItem>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select
                value={filters.userFilter}
                onValueChange={(v) => setFilters((f) => ({ ...f, userFilter: v }))}
                disabled={exporting}
              >
                <SelectTrigger>
                  <Users className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUDIT_FILTER_ALL}>Todos os usuários</SelectItem>
                  {actors.map((a) => (
                    <SelectItem key={a.userId} value={a.userId}>
                      {a.fullName} ({a.logCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filters.rangePreset === 'custom' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="export-start">Data inicial</Label>
                <Input
                  id="export-start"
                  type="date"
                  value={filters.customStart}
                  onChange={(e) => setFilters((f) => ({ ...f, customStart: e.target.value }))}
                  disabled={exporting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-end">Data final</Label>
                <Input
                  id="export-end"
                  type="date"
                  value={filters.customEnd}
                  onChange={(e) => setFilters((f) => ({ ...f, customEnd: e.target.value }))}
                  disabled={exporting}
                />
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select
                value={filters.actionFilter}
                onValueChange={(v) => setFilters((f) => ({ ...f, actionFilter: v }))}
                disabled={exporting}
              >
                <SelectTrigger>
                  <Filter className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIT_ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entidade</Label>
              <Select
                value={filters.entityFilter}
                onValueChange={(v) => setFilters((f) => ({ ...f, entityFilter: v }))}
                disabled={exporting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUDIT_FILTER_ALL}>Todas as entidades</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Colunas do CSV</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={exporting}
                  onClick={() => setSelectedColumns([...AUDIT_CSV_COLUMNS])}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={exporting}
                  onClick={() =>
                    setSelectedColumns(['data_hora', 'usuario', 'acao', 'entidade', 'entidade_id'])
                  }
                >
                  Resumo
                </Button>
              </div>
            </div>
            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
              {AUDIT_CSV_COLUMNS.map((col) => (
                <Label
                  key={col}
                  htmlFor={`col-${col}`}
                  className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                >
                  <Checkbox
                    id={`col-${col}`}
                    checked={selectedColumns.includes(col)}
                    onCheckedChange={(v) => toggleColumn(col, v === true)}
                    disabled={exporting}
                  />
                  {AUDIT_COLUMN_LABELS[col]}
                </Label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleExport()} disabled={exporting} className="gap-2">
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
