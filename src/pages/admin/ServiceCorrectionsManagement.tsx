import { useEffect, useState } from "react";
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  RefreshCw,
  Search,
  Building2,
  ExternalLink,
  CheckCircle2,
  Circle,
  ListChecks,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useServiceCorrectionsAdmin, type ServiceCorrectionRow } from "@/hooks/useServiceCorrectionsAdmin";
import {
  correctionDisplayLabel,
  correctionFieldLabel,
  correctionTypeLabel,
  isServiceCorrectionSlaOverdue,
  serviceCorrectionSlaDeadline,
  SERVICE_CORRECTION_REVIEW_SLA_HOURS,
} from "@/lib/serviceCorrectionFields";
import { ServiceCorrectionsKpiStrip } from '@/components/admin/service-corrections/ServiceCorrectionsKpiStrip';

const MIN_NOTES_ON_REJECT = 10;

function ServiceCorrectionSlaBadge({ row }: { row: ServiceCorrectionRow }) {
  if (row.status !== "pending" || !row.created_at) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const deadline = serviceCorrectionSlaDeadline(row.created_at);
  const overdue = isServiceCorrectionSlaOverdue(row.created_at, row.status);
  if (overdue) {
    return (
      <Badge variant="destructive" className="whitespace-nowrap font-normal gap-1">
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
        Acima de {SERVICE_CORRECTION_REVIEW_SLA_HOURS}h
      </Badge>
    );
  }
  return (
    <span className="text-xs text-muted-foreground whitespace-nowrap block max-w-[140px]">
      Até {format(deadline, "dd/MM HH:mm", { locale: ptBR })}
      <span className="block text-[10px] mt-0.5 opacity-90">
        {formatDistanceToNow(deadline, { locale: ptBR, addSuffix: true })}
      </span>
    </span>
  );
}

function statusBadge(status: string | null) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30">Pendente</Badge>;
    case "approved":
      return <Badge className="bg-blue-500/15 text-blue-800 border-blue-500/30">Aceita</Badge>;
    case "rejected":
      return <Badge className="bg-rose-500/15 text-rose-800 border-rose-500/30">Recusada</Badge>;
    case "applied":
      return <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-500/30">Aplicada</Badge>;
    default:
      return <Badge variant="secondary">{status ?? "—"}</Badge>;
  }
}

function ModerationStepper({ status }: { status: string | null }) {
  const pending = status === "pending";
  const approved = status === "approved";
  const applied = status === "applied";
  const rejected = status === "rejected";

  const approvalDone = approved || applied || rejected;
  const approvalActive = pending;

  const cadastroLabel = rejected ? "Sem alteração no cadastro" : "Cadastro oficial";
  let cadastroVariant: "done" | "active" | "todo" = "todo";
  if (applied) cadastroVariant = "done";
  else if (approved) cadastroVariant = "active";

  const Step = ({
    label,
    variant,
  }: {
    label: string;
    variant: "done" | "active" | "todo";
  }) => (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0 text-center">
      {variant === "done" ? (
        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" aria-hidden />
      ) : variant === "active" ? (
        <Circle className="h-6 w-6 text-primary fill-primary/20 shrink-0" aria-hidden />
      ) : (
        <Circle className="h-6 w-6 text-muted-foreground/40 shrink-0" aria-hidden />
      )}
      <span
        className={`text-[10px] sm:text-xs font-medium leading-tight ${
          variant === "active" ? "text-primary" : variant === "done" ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div
      className="flex items-start justify-between gap-1 rounded-lg border bg-muted/30 p-3"
      role="list"
      aria-label="Etapas da moderação"
    >
      <Step label="Recebida" variant="done" />
      <div className="self-center h-px flex-1 bg-border min-w-[8px] mx-0.5 mt-[-20px]" aria-hidden />
      <Step label="Aprovação" variant={approvalDone ? "done" : approvalActive ? "active" : "todo"} />
      <div className="self-center h-px flex-1 bg-border min-w-[8px] mx-0.5 mt-[-20px]" aria-hidden />
      <Step label={cadastroLabel} variant={cadastroVariant} />
    </div>
  );
}

function PendingQueueTable({
  rows,
  loading,
  openDetail,
}: {
  rows: ServiceCorrectionRow[];
  loading: boolean;
  openDetail: (row: ServiceCorrectionRow) => void;
}) {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-lg bg-muted/20">
        <Inbox className="h-12 w-12 text-muted-foreground mb-3" aria-hidden />
        <p className="font-medium text-foreground">Nenhuma sugestão pendente</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Quando munícipes enviarem correções sobre equipamentos, elas aparecerão aqui para validação.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveTable<ServiceCorrectionRow>
      keyExtractor={(row) => row.id}
      data={rows}
      columns={[
        {
          header: "Equipamento",
          accessor: (row) => (
            <span className="font-medium line-clamp-2 max-w-[200px]">{row.public_services?.name ?? "—"}</span>
          ),
        },
        {
          header: "Tipo",
          accessor: (row) => (
            <span className="text-sm line-clamp-2 max-w-[180px]">
              {correctionDisplayLabel(row.correction_type, row.field_name)}
            </span>
          ),
        },
        {
          header: "Munícipe",
          accessor: (row) => <span className="text-sm">{row.submitter?.full_name ?? "—"}</span>,
        },
        {
          header: "Enviada em",
          accessor: (row) =>
            row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—",
          hideOnMobile: true,
        },
        {
          header: `Prazo (${SERVICE_CORRECTION_REVIEW_SLA_HOURS}h)`,
          accessor: (row) => <ServiceCorrectionSlaBadge row={row} />,
          hideOnMobile: true,
        },
        {
          header: "Resumo",
          accessor: (row) => (
            <span className="text-sm text-muted-foreground line-clamp-2 max-w-[240px]">{row.suggested_value}</span>
          ),
          hideOnMobile: true,
        },
        {
          header: "Ação",
          accessor: (row) => (
            <Button type="button" size="sm" variant="default" onClick={() => openDetail(row)}>
              Validar
            </Button>
          ),
        },
      ]}
      renderMobileCard={(row) => (
        <div className="space-y-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Equipamento</p>
              <p className="font-medium">{row.public_services?.name ?? "—"}</p>
            </div>
            <Badge className="shrink-0 bg-amber-500/15 text-amber-800 border-amber-500/30">Pendente</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="text-sm">{correctionDisplayLabel(row.correction_type, row.field_name)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Munícipe</p>
            <p className="text-sm">{row.submitter?.full_name ?? "—"}</p>
          </div>
          {row.created_at ? (
            <div>
              <p className="text-xs text-muted-foreground">Prazo de validação</p>
              <div className="mt-0.5">
                <ServiceCorrectionSlaBadge row={row} />
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground">Descrição</p>
            <p className="text-sm text-muted-foreground line-clamp-4">{row.suggested_value}</p>
          </div>
          <Button type="button" className="w-full" onClick={() => openDetail(row)}>
            Validar sugestão
          </Button>
        </div>
      )}
    />
  );
}

type ServiceCorrectionsManagementProps = {
  embedded?: boolean;
  hidePageHeader?: boolean;
  onRefreshReady?: (refresh: () => void) => void;
};

export default function ServiceCorrectionsManagement({
  embedded,
  hidePageHeader: _hidePageHeader,
  onRefreshReady,
}: ServiceCorrectionsManagementProps = {}) {
  const {
    rows,
    loading,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    refetch,
    updateModeration,
    statusCounts,
  } = useServiceCorrectionsAdmin();

  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  useEffect(() => {
    if (activeTab === "queue") {
      setStatusFilter("pending");
    } else {
      setStatusFilter(historyFilter);
    }
  }, [activeTab, historyFilter, setStatusFilter]);

  const goHistory = (filter: string) => {
    setHistoryFilter(filter);
    setActiveTab("history");
  };

  const [detail, setDetail] = useState<ServiceCorrectionRow | null>(null);
  const [staffNotes, setStaffNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const openDetail = (row: ServiceCorrectionRow) => {
    setDetail(row);
    setStaffNotes(row.staff_notes ?? "");
  };

  const runAction = async (status: "approved" | "rejected" | "applied") => {
    if (!detail) return;
    if (status === "rejected" && staffNotes.trim().length < MIN_NOTES_ON_REJECT) {
      toast.error(`Ao recusar, preencha as notas internas com pelo menos ${MIN_NOTES_ON_REJECT} caracteres (motivo registrado).`);
      return;
    }
    setActing(true);
    try {
      await updateModeration(detail.id, { status, staff_notes: staffNotes });
      toast.success(
        status === "approved"
          ? 'Aprovação registrada. Atualize o cadastro oficial e depois use o botão "Cadastro oficial atualizado" nesta sugestão.'
          : status === "rejected"
            ? "Sugestão recusada."
            : "Cadastro marcado como atualizado; o munícipe foi notificado.",
      );
      setDetail(null);
      setRejectDialogOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("applied") && msg.includes("approved")) {
        toast.error(
          "Fluxo incorreto: aceite a sugestão antes de marcar o cadastro como atualizado. Se o erro persistir, recarregue a página.",
        );
      } else {
        toast.error(msg || "Falha ao atualizar.");
      }
    } finally {
      setActing(false);
    }
  };

  const requestReject = () => {
    if (staffNotes.trim().length < MIN_NOTES_ON_REJECT) {
      toast.error(`Informe o motivo da recusa nas notas internas (mín. ${MIN_NOTES_ON_REJECT} caracteres).`);
      return;
    }
    setRejectDialogOpen(true);
  };

  useEffect(() => {
    onRefreshReady?.(() => void refetch());
  }, [onRefreshReady, refetch]);

  return (
    <AdminPageShell embedded={embedded}>
      <div className="space-y-6">
        <p className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Fluxo:</strong> aceitar a sugestão → atualizar cadastro oficial → marcar{' '}
          <strong className="text-foreground">cadastro atualizado</strong>. Meta: fila pendente em até{' '}
          {SERVICE_CORRECTION_REVIEW_SLA_HOURS}h.
        </p>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "queue" | "history")}
          className="space-y-4"
        >
          <TabsList className="grid w-full max-w-xl grid-cols-2 h-auto p-1 gap-1">
            <TabsTrigger value="queue" className="flex flex-wrap items-center justify-center gap-2 py-2.5">
              <Inbox className="h-4 w-4 shrink-0" />
              <span>Fila de pendentes</span>
              {statusCounts.pending > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {statusCounts.pending}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="history" className="py-2.5">
              Histórico e indicadores
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={
                activeTab === "queue"
                  ? "Filtrar pendentes por equipamento, munícipe ou texto da sugestão…"
                  : "Buscar no histórico por texto, equipamento, munícipe ou moderador…"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <TabsContent value="queue" className="mt-0 space-y-4">
            <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
              <div className="space-y-3 border-b border-border/80 px-4 py-4 md:px-5">
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <ListChecks className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden />
                    {statusCounts.pending} sugestão(ões) aguardando validação
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Fora do prazo de {SERVICE_CORRECTION_REVIEW_SLA_HOURS}h primeiro; depois as mais próximas do limite.
                  </p>
                  {statusCounts.pendingOverSla > 0 ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                      {statusCounts.pendingOverSla} fora do prazo — priorize a validação.
                    </p>
                  ) : null}
                </div>
              </div>
              <PendingQueueTable rows={rows} loading={loading} openDetail={openDetail} />
            </section>
          </TabsContent>

          <TabsContent value="history" className="mt-0 space-y-6">
            <ServiceCorrectionsKpiStrip
              counts={statusCounts}
              historyFilter={historyFilter}
              onSelect={(filter, tab) => {
                if (tab === 'queue') setActiveTab('queue');
                else goHistory(filter);
              }}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:max-w-md">
                <Label htmlFor="history-status" className="sr-only">
                  Filtrar por status
                </Label>
                <Select
                  value={historyFilter}
                  onValueChange={(v) => {
                    setHistoryFilter(v);
                  }}
                >
                  <SelectTrigger id="history-status" className="w-full">
                    <SelectValue placeholder="Status no histórico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Aceitas</SelectItem>
                    <SelectItem value="rejected">Recusadas</SelectItem>
                    <SelectItem value="applied">Aplicadas</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : rows.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">Nenhuma sugestão neste filtro.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {rows.map((row) => {
                      const svc = row.public_services;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                            onClick={() => openDetail(row)}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {statusBadge(row.status)}
                                  <span className="font-medium truncate">
                                    {correctionDisplayLabel(row.correction_type, row.field_name)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{svc?.name ?? "Equipamento"}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {row.created_at
                                    ? format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                    : "—"}{" "}
                                  · {row.submitter?.full_name ?? row.user_id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm mt-2 line-clamp-2 text-foreground/90">{row.suggested_value}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Validar sugestão de correção</DialogTitle>
              <DialogDescription className="space-y-2">
                <span>
                  Equipamento: <strong>{detail?.public_services?.name ?? "—"}</strong>
                </span>
                {detail?.service_id ? (
                  <Link
                    to={`/servico/${detail.service_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline w-fit"
                  >
                    Abrir ficha no app
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            {detail && (
              <div className="space-y-4 text-sm">
                <ModerationStepper status={detail.status} />

                <div>{statusBadge(detail.status)}</div>

                {detail.status === "pending" && detail.created_at ? (
                  <div
                    className={
                      isServiceCorrectionSlaOverdue(detail.created_at, detail.status)
                        ? "rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
                        : "rounded-md border bg-muted/30 p-3 text-sm"
                    }
                  >
                    <p className="font-medium text-foreground">
                      Prazo de {SERVICE_CORRECTION_REVIEW_SLA_HOURS}h (desde o envio)
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Validar até{" "}
                      <strong className="text-foreground">
                        {format(serviceCorrectionSlaDeadline(detail.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </strong>
                      {" — "}
                      {formatDistanceToNow(serviceCorrectionSlaDeadline(detail.created_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </p>
                    {isServiceCorrectionSlaOverdue(detail.created_at, detail.status) ? (
                      <p className="text-destructive font-medium mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                        Prazo ultrapassado; priorize esta sugestão.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {detail.status !== "pending" && (
                  <div className="rounded-md border bg-muted/20 p-3 space-y-2 text-xs">
                    <p>
                      <span className="text-muted-foreground">Decidido em:</span>{" "}
                      {detail.reviewed_at
                        ? format(new Date(detail.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Validado por:</span>{" "}
                      {detail.reviewer?.full_name ?? "—"}
                    </p>
                    {detail.staff_notes ? (
                      <p>
                        <span className="text-muted-foreground">Notas internas:</span>{" "}
                        <span className="text-foreground whitespace-pre-wrap">{detail.staff_notes}</span>
                      </p>
                    ) : null}
                  </div>
                )}

                <Separator />

                <div>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  {correctionTypeLabel(detail.correction_type)}
                  {detail.field_name ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · detalhe: {correctionFieldLabel(detail.field_name)}
                    </span>
                  ) : null}
                </div>
                <div>
                  <span className="text-muted-foreground">Valor de referência (no app):</span>
                  <p className="mt-1 rounded-md border bg-muted/30 p-2 whitespace-pre-wrap break-words">
                    {detail.current_value ?? "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Descrição / sugestão:</span>
                  <p className="mt-1 rounded-md border p-2 whitespace-pre-wrap break-words">
                    {detail.suggested_value}
                  </p>
                </div>
                {detail.evidence_photo_url ? (
                  <div className="space-y-2">
                    <span className="text-muted-foreground">Evidência (foto):</span>
                    <a
                      href={detail.evidence_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-md border overflow-hidden max-w-sm"
                    >
                      <img
                        src={detail.evidence_photo_url}
                        alt="Evidência enviada pelo munícipe"
                        className="w-full h-auto max-h-64 object-contain bg-muted/30"
                      />
                    </a>
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground">Munícipe:</span>{" "}
                  {detail.submitter?.full_name} ({detail.user_id.slice(0, 8)}…)
                </div>

                {(detail.status === "pending" || detail.status === "approved") && (
                  <div className="space-y-2">
                    <Label htmlFor="staff-notes">
                      Notas internas
                      {detail.status === "pending" ? (
                        <span className="text-destructive font-normal">
                          {" "}
                          (obrigatório ao recusar, mín. {MIN_NOTES_ON_REJECT} caracteres)
                        </span>
                      ) : null}
                    </Label>
                    <Textarea
                      id="staff-notes"
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      rows={4}
                      placeholder="Motivo da recusa, protocolo interno, ou observações ao aceitar ou ao atualizar o cadastro."
                    />
                    {detail.status === "pending" ? (
                      <p className="text-[11px] text-muted-foreground">
                        <strong>Aceitar:</strong> aprova a sugestão — o cadastro oficial{" "}
                        <strong>não</strong> muda neste passo; atualize-o no processo interno e depois marque &quot;Cadastro
                        atualizado&quot; no histórico. <strong>Recusar:</strong> exige motivo nas notas — o munícipe é
                        notificado.
                      </p>
                    ) : (
                      <div className="rounded-md border border-blue-500/25 bg-blue-500/5 p-3 text-[11px] text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">Próximo passo obrigatório</p>
                        <p>
                          Atualize o registro oficial (fonte de verdade). Somente depois use{" "}
                          <strong>Cadastro oficial atualizado</strong> — o sistema não altera{" "}
                          <code className="text-xs bg-muted px-1 rounded">public_services</code> automaticamente a partir
                          desta tela.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {detail?.status === "pending" && (
                <>
                  <Button variant="destructive" disabled={acting} onClick={requestReject} type="button">
                    Recusar…
                  </Button>
                  <Button variant="secondary" disabled={acting} onClick={() => runAction("approved")} type="button">
                    Aceitar (aprovar)
                  </Button>
                </>
              )}
              {detail?.status === "approved" && (
                <>
                  <Button variant="outline" disabled={acting} onClick={() => setDetail(null)} type="button">
                    Fechar
                  </Button>
                  <Button disabled={acting} onClick={() => runAction("applied")} type="button">
                    Cadastro oficial atualizado
                  </Button>
                </>
              )}
              {detail && detail.status !== "pending" && detail.status !== "approved" && (
                <Button variant="outline" onClick={() => setDetail(null)} type="button">
                  Fechar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar recusa?</AlertDialogTitle>
              <AlertDialogDescription>
                O munícipe será notificado de que a sugestão não será aplicada. As notas internas ficam apenas para a
                equipe.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={acting}>Cancelar</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={acting}
                onClick={() => void runAction("rejected")}
              >
                {acting ? "Salvando…" : "Confirmar recusa"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminPageShell>
  );
}
