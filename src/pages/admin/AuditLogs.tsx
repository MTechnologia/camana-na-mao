import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Download,
  Eye,
  Filter,
  Lock,
  Search,
  Users,
} from "lucide-react";
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { useAuditLog } from "@/hooks/useAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePerformanceMark } from "@/hooks/usePerformanceMark";
import { AuditExportDialog } from "@/components/admin/audit/AuditExportDialog";
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_FILTER_ALL,
  buildAuditLogQueryFilters,
  type AuditExportFilterState,
  type AuditRangePreset,
} from "@/lib/auditExportFilters";

/**
 * HU-12.2 — Trilha de auditoria com filtros completos.
 *
 * Filtros:
 *   - Busca textual (action/entity/usuário) — client-side
 *   - Período via presets (24h, 7d, 30d, custom) — server-side
 *   - Usuário (autocomplete de atores que já aparecem nos logs) — server-side
 *   - Ação e entidade — server-side
 *
 * UX:
 *   - Clicar em linha abre Sheet com diff old vs new (HU-12.2)
 *   - Botão Exportar CSV abre modal para escolher filtros e colunas
 *   - Badge "Imutável" no header reforça compliance (HU-12.3)
 */

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
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function fmtDateTime(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  } catch {
    return iso;
  }
}

const AuditLogs = ({ embedded }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const { hasRole, loading: roleLoading } = useUserRole();
  const { getAllLogs, getActors } = useAuditLog();

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [actors, setActors] = useState<
    Array<{ userId: string; fullName: string; email: string; logCount: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>(AUDIT_FILTER_ALL);
  const [entityFilter, setEntityFilter] = useState<string>(AUDIT_FILTER_ALL);
  const [userFilter, setUserFilter] = useState<string>(AUDIT_FILTER_ALL);
  const [rangePreset, setRangePreset] = useState<AuditRangePreset>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // HU-13.2 — Mede tempo de carga inicial da página (SLA 3s).
  usePerformanceMark("audit_logs_load", !isLoading);

  useEffect(() => {
    if (!roleLoading && !hasRole("admin")) {
      navigate("/");
    }
  }, [hasRole, roleLoading, navigate]);

  const loadActors = useCallback(async () => {
    const result = await getActors();
    setActors(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportFilters = useMemo<AuditExportFilterState>(
    () => ({
      searchTerm,
      actionFilter,
      entityFilter,
      userFilter,
      rangePreset,
      customStart,
      customEnd,
    }),
    [searchTerm, actionFilter, entityFilter, userFilter, rangePreset, customStart, customEnd],
  );

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    const data = (await getAllLogs(
      buildAuditLogQueryFilters(exportFilters),
    )) as unknown as AuditLogRow[];
    setLogs(data ?? []);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportFilters]);

  useEffect(() => {
    void loadActors();
  }, [loadActors]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const actorById = useMemo(() => {
    const m = new Map<string, (typeof actors)[number]>();
    for (const a of actors) m.set(a.userId, a);
    return m;
  }, [actors]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const actor = log.user_id ? actorById.get(log.user_id) : null;
      const hay = `${log.action} ${log.entity_type} ${log.entity_id ?? ""} ${actor?.fullName ?? ""} ${actor?.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [logs, searchTerm, actorById]);

  const entityTypes = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entity_type))).sort(),
    [logs],
  );

  if (roleLoading) {
    return (
      <AdminPageShell embedded={embedded}>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell embedded={embedded}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Logs de Auditoria
              <Badge variant="outline" className="text-[10px] h-5 px-2 gap-1">
                <Lock className="h-3 w-3" />
                Imutável
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              Histórico completo de ações administrativas no sistema.
              Registros não podem ser editados ou apagados (somente arquivados
              após 12 meses).
            </p>
          </div>
          <Button onClick={() => setExportOpen(true)} className="gap-2" variant="outline">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <Card className="p-3 space-y-3">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar (ação, entidade, usuário, ID)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={rangePreset} onValueChange={(v) => setRangePreset(v as AuditRangePreset)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
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

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <Users className="w-3.5 h-3.5 mr-1" />
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

          <div className="flex flex-col lg:flex-row gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full lg:w-[220px]">
                <Filter className="w-3.5 h-3.5 mr-1" />
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

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full lg:w-[220px]">
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

            {rangePreset === "custom" && (
              <>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full lg:w-[180px]"
                />
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full lg:w-[180px]"
                />
              </>
            )}
          </div>
        </Card>

        {/* Tabela */}
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actor = log.user_id ? actorById.get(log.user_id) : null;
                  return (
                    <TableRow
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer hover:bg-muted/40"
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {actor?.fullName ?? (
                          <span className="font-mono text-muted-foreground">
                            {log.user_id?.slice(0, 8) ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{log.entity_type}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.entity_id ? `${log.entity_id.slice(0, 8)}...` : "-"}
                      </TableCell>
                      <TableCell>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Exibindo {filteredLogs.length} de {logs.length} registros
          {logs.length >= 500 && (
            <span> · Limite 500 — refine os filtros para ver mais.</span>
          )}
        </div>
      </div>

      <AuditLogDetailSheet
        log={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        actor={selected?.user_id ? actorById.get(selected.user_id) ?? null : null}
      />

      <AuditExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        defaultFilters={exportFilters}
        actors={actors}
        entityTypes={entityTypes}
      />
    </AdminPageShell>
  );
};

// ============================================================================
// Sheet de detalhes com diff old vs new
// ============================================================================

interface AuditLogDetailSheetProps {
  log: AuditLogRow | null;
  onOpenChange: (open: boolean) => void;
  actor: { fullName: string; email: string } | null;
}

function AuditLogDetailSheet({ log, onOpenChange, actor }: AuditLogDetailSheetProps) {
  if (!log) return null;

  const oldKeys = log.old_values ? Object.keys(log.old_values) : [];
  const newKeys = log.new_values ? Object.keys(log.new_values) : [];
  const allKeys = Array.from(new Set([...oldKeys, ...newKeys])).sort();

  return (
    <Sheet open={!!log} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{log.action}</SheetTitle>
          <SheetDescription>
            {log.entity_type}
            {log.entity_id && (
              <span className="font-mono text-xs ml-1">· {log.entity_id}</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <Card className="p-3 text-xs space-y-1">
            <p>
              <span className="text-muted-foreground">Quando: </span>
              {fmtDateTime(log.created_at)}
            </p>
            <p>
              <span className="text-muted-foreground">Quem: </span>
              {actor?.fullName ?? log.user_id ?? "—"}
              {actor?.email && (
                <span className="text-muted-foreground"> ({actor.email})</span>
              )}
            </p>
            {log.ip_address && (
              <p>
                <span className="text-muted-foreground">IP: </span>
                {log.ip_address}
              </p>
            )}
            {log.user_agent && (
              <p className="truncate" title={log.user_agent}>
                <span className="text-muted-foreground">Agent: </span>
                {log.user_agent}
              </p>
            )}
          </Card>

          {allKeys.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Sem dados de antes/depois para este registro.
            </p>
          ) : (
            <Card className="p-3">
              <p className="text-xs font-semibold mb-2">Diff (antes → depois)</p>
              <div className="text-[11px] font-mono space-y-1 max-h-96 overflow-y-auto">
                {allKeys.map((key) => {
                  const oldVal = log.old_values?.[key];
                  const newVal = log.new_values?.[key];
                  const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                  if (!changed) return null;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "p-1.5 rounded border-l-2 break-all",
                        oldVal === undefined && "border-green-500 bg-green-50",
                        newVal === undefined && "border-red-500 bg-red-50",
                        oldVal !== undefined && newVal !== undefined && "border-amber-500 bg-amber-50",
                      )}
                    >
                      <p className="font-semibold">{key}</p>
                      <p className="text-muted-foreground line-through">
                        {JSON.stringify(oldVal) ?? "—"}
                      </p>
                      <p>{JSON.stringify(newVal) ?? "—"}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-semibold mb-2">Metadata</p>
              <pre className="text-[11px] font-mono max-h-40 overflow-y-auto bg-muted p-2 rounded">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AuditLogs;
