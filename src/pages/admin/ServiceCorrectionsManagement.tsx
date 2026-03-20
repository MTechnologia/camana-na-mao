import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { ClipboardList, RefreshCw, Search, Building2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useServiceCorrectionsAdmin, type ServiceCorrectionRow } from "@/hooks/useServiceCorrectionsAdmin";
import {
  correctionDisplayLabel,
  correctionFieldLabel,
  correctionTypeLabel,
} from "@/lib/serviceCorrectionFields";

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

export default function ServiceCorrectionsManagement() {
  const {
    rows,
    loading,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    refetch,
    updateModeration,
  } = useServiceCorrectionsAdmin();

  const [detail, setDetail] = useState<ServiceCorrectionRow | null>(null);
  const [staffNotes, setStaffNotes] = useState("");
  const [acting, setActing] = useState(false);

  const openDetail = (row: ServiceCorrectionRow) => {
    setDetail(row);
    setStaffNotes(row.staff_notes ?? "");
  };

  const runAction = async (status: "approved" | "rejected" | "applied") => {
    if (!detail) return;
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setActing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Sugestões de correção (cadastro)
            </h1>
            <p className="text-muted-foreground mt-1">
              Munícipes podem sugerir ajustes nos dados de equipamentos públicos. Analise e registre o parecer.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por texto, equipamento ou munícipe…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aceitas</SelectItem>
              <SelectItem value="rejected">Recusadas</SelectItem>
              <SelectItem value="applied">Aplicadas</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
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

        <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhe da sugestão</DialogTitle>
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
                <div>{statusBadge(detail.status)}</div>
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
                <div className="space-y-2">
                  <Label htmlFor="staff-notes">Notas internas (opcional)</Label>
                  <Textarea
                    id="staff-notes"
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    rows={3}
                    placeholder="Motivo da recusa, protocolo interno, etc."
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {detail?.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    disabled={acting}
                    onClick={() => runAction("rejected")}
                    type="button"
                  >
                    Recusar
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
      </div>
    </AdminLayout>
  );
}
