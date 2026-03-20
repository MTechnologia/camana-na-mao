import { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
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
import { format } from "date-fns";
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
} from "lucide-react";
import { toast } from "sonner";
import { useServiceCorrectionsAdmin, type ServiceCorrectionRow } from "@/hooks/useServiceCorrectionsAdmin";
import {
  correctionDisplayLabel,
  correctionFieldLabel,
  correctionTypeLabel,
} from "@/lib/serviceCorrectionFields";
import { KPICard } from "@/components/analytics/KPICard";

const MIN_NOTES_ON_REJECT = 10;

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
  const settled = Boolean(status && status !== "pending");

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
      <Step label="Validação admin" variant={settled ? "done" : pending ? "active" : "todo"} />
      <div className="self-center h-px flex-1 bg-border min-w-[8px] mx-0.5 mt-[-20px]" aria-hidden />
      <Step label="Concluída" variant={settled ? "done" : "todo"} />
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
          Quando munícipes enviarem correções de cadastro, elas aparecerão aqui para validação.
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

export default function ServiceCorrectionsManagement() {
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
          ? "Sugestão aceita."
          : status === "rejected"
            ? "Sugestão recusada."
            : "Marcada como aplicada no cadastro.",
      );
      setDetail(null);
      setRejectDialogOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Painel — sugestões de correção de cadastro
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              <strong>Fila de pendentes:</strong> validação rápida em tabela. <strong>Histórico:</strong> consulta por
              status e decisões anteriores. Apenas administradores moderam; o munícipe é notificado após a decisão.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

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
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      {statusCounts.pending} sugestão(ões) aguardando validação
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Ordem: mais recentes primeiro. Clique em <strong>Validar</strong> para abrir o fluxo de decisão.
                    </p>
                  </div>
                </div>
                <PendingQueueTable rows={rows} loading={loading} openDetail={openDetail} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-0 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <KPICard
                title="Pendentes"
                value={statusCounts.pending}
                icon={ListChecks}
                subtitle="Ir para a fila"
                onClick={() => setActiveTab("queue")}
              />
              <KPICard
                title="Aceitas"
                value={statusCounts.approved}
                icon={CheckCircle2}
                subtitle="Equipe concordou"
                onClick={() => goHistory("approved")}
                className={historyFilter === "approved" ? "ring-2 ring-primary/40" : ""}
              />
              <KPICard
                title="Recusadas"
                value={statusCounts.rejected}
                icon={Circle}
                subtitle="Não aplicadas"
                onClick={() => goHistory("rejected")}
                className={historyFilter === "rejected" ? "ring-2 ring-primary/40" : ""}
              />
              <KPICard
                title="Aplicadas"
                value={statusCounts.applied}
                icon={CheckCircle2}
                subtitle="Registro no cadastro"
                onClick={() => goHistory("applied")}
                className={historyFilter === "applied" ? "ring-2 ring-primary/40" : ""}
              />
              <KPICard
                title="Total"
                value={statusCounts.all}
                icon={ClipboardList}
                subtitle="Todos os status"
                onClick={() => goHistory("all")}
                className={`col-span-2 lg:col-span-1 ${historyFilter === "all" ? "ring-2 ring-primary/40" : ""}`}
              />
            </div>

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

                {detail.status === "pending" && (
                  <div className="space-y-2">
                    <Label htmlFor="staff-notes">
                      Notas internas
                      <span className="text-destructive font-normal"> (obrigatório ao recusar, mín. {MIN_NOTES_ON_REJECT} caracteres)</span>
                    </Label>
                    <Textarea
                      id="staff-notes"
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      rows={4}
                      placeholder="Motivo da recusa, protocolo interno, ou observações ao aceitar/aplicar."
                    />
                    <p className="text-[11px] text-muted-foreground">
                      <strong>Aceitar:</strong> concordância com a sugestão (o cadastro pode ser atualizado depois).{" "}
                      <strong>Aplicada:</strong> use quando a correção já foi refletida no cadastro oficial.{" "}
                      <strong>Recusar:</strong> exige motivo nas notas — o munícipe recebe notificação genérica.
                    </p>
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
                    Aceitar
                  </Button>
                  <Button disabled={acting} onClick={() => runAction("applied")} type="button">
                    Registrar como aplicada
                  </Button>
                </>
              )}
              {detail && detail.status !== "pending" && (
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
    </AdminLayout>
  );
}
