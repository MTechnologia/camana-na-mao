import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useReportDetail, type ReportAuditEntry, type ReportComment, type ReportDetail, type ReportAuthor } from "@/hooks/useReportDetail";
import { useReportDetailModal, type ReportSource } from "@/contexts/ReportDetailContext";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { TriageEditor } from "@/components/admin/triage/TriageEditor";
import { ReportTimelineTab } from "@/components/admin/triage/ReportTimelineTab";
import { CommissionReferralDialog } from "@/components/admin/triage/CommissionReferralDialog";

/**
 * HU-3.6 — Sheet lateral com detalhes completos de um relato individual.
 *
 * Sub-tabs:
 *   - Detalhes  : descrição, fotos, localização, campos extras, mapa
 *   - Autor     : nome, contato (admin), demografia, total de relatos
 *   - IA        : análise IA (sentimento, prioridade, padrões, tags)
 *   - Histórico : audit_logs com mudanças e timeline
 *
 * Footer com ações administrativas: mudar status, adicionar comentário.
 */

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "rejected", label: "Rejeitado" },
];

function severityColorClass(severity: string | null): string {
  const s = (severity ?? "").toLowerCase();
  if (s.includes("crit") || s.includes("crít")) return "bg-destructive text-destructive-foreground";
  if (s.includes("alto") || s === "alta" || s === "high") return "bg-amber-500 text-white";
  if (s.includes("med") || s === "medium") return "bg-yellow-200 text-yellow-900";
  if (s.includes("bai") || s === "low") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

function statusLabel(status: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "resolved" || s === "resolvido" || s === "concluido") return "Resolvido";
  if (s === "rejected" || s === "rejeitado") return "Rejeitado";
  if (s.includes("andamento") || s === "in_progress") return "Em andamento";
  if (s === "pending" || s.includes("pendente")) return "Pendente";
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function ReportDetailSheet() {
  const { opened, close } = useReportDetailModal();
  const id = opened?.id ?? null;
  const source = opened?.source ?? null;

  const {
    detail,
    author,
    comments,
    auditLog,
    isLoading,
    error,
    refresh,
    applyOptimisticDetail,
    applyOptimisticComment,
  } = useReportDetail(id, source);
  const [activeTab, setActiveTab] = useState<
    "detalhes" | "autor" | "ia" | "triagem" | "acompanhamento" | "historico"
  >("detalhes");
  const [referralOpen, setReferralOpen] = useState(false);
  const { canManageTriage, isAdmin, isGestor, isAssessor } = useUserRole();
  const canReferToCommission = isAdmin || isGestor || isAssessor;

  return (
    <Sheet open={!!opened} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{detail?.title || "Carregando…"}</span>
              </SheetTitle>
              <SheetDescription className="text-xs flex flex-wrap gap-2 items-center mt-1">
                {detail?.protocolCode && (
                  <span className="font-mono">#{detail.protocolCode}</span>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {source === "urban" ? "Urbano" : "Transporte"}
                </Badge>
                {detail?.status && (
                  <Badge variant="secondary" className="text-[10px]">
                    {statusLabel(detail.status)}
                  </Badge>
                )}
                {detail?.severity && (
                  <Badge className={cn("text-[10px]", severityColorClass(detail.severity))}>
                    {detail.severity}
                  </Badge>
                )}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refresh()}
              disabled={isLoading}
              aria-label="Atualizar"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="flex flex-wrap mx-4 mt-3 h-auto gap-1 p-1">
            <TabsTrigger value="detalhes" className="flex-1 min-w-[80px] text-xs">Detalhes</TabsTrigger>
            <TabsTrigger value="autor" className="flex-1 min-w-[80px] text-xs">Autor</TabsTrigger>
            <TabsTrigger value="ia" className="flex-1 min-w-[60px] text-xs">IA</TabsTrigger>
            {canManageTriage && (
              <TabsTrigger value="triagem" className="flex-1 min-w-[80px] text-xs">Triagem</TabsTrigger>
            )}
            <TabsTrigger value="acompanhamento" className="flex-1 min-w-[120px] text-xs">Acompanhamento</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1 min-w-[90px] text-xs">Histórico</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <TabsContent value="detalhes" className="mt-0 space-y-4">
              <DetailsPanel detail={detail} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="autor" className="mt-0 space-y-4">
              <AuthorPanel author={author} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="ia" className="mt-0 space-y-4">
              <AIPanel detail={detail} isLoading={isLoading} />
            </TabsContent>

            {canManageTriage && (
              <TabsContent value="triagem" className="mt-0 space-y-4">
                {id && source && (
                  <TriageEditor reportId={id} source={source} canEdit={canManageTriage} />
                )}
              </TabsContent>
            )}

            <TabsContent value="acompanhamento" className="mt-0 space-y-4">
              {id && source && (
                <>
                  <ReportTimelineTab reportId={id} source={source} />
                  {canReferToCommission && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReferralOpen(true)}
                      >
                        <Send className="h-3.5 w-3.5 mr-2" />
                        Encaminhar a comissão
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="historico" className="mt-0 space-y-4">
              <HistoryPanel
                auditLog={auditLog}
                comments={comments}
                isLoading={isLoading}
              />
            </TabsContent>
          </div>

          {/* Footer com ações administrativas */}
          {detail && (
            <ActionsFooter
              detail={detail}
              source={source!}
              onChange={refresh}
              applyOptimisticDetail={applyOptimisticDetail}
              applyOptimisticComment={applyOptimisticComment}
            />
          )}
        </Tabs>

        {id && source && canReferToCommission && (
          <CommissionReferralDialog
            open={referralOpen}
            onOpenChange={setReferralOpen}
            reportId={id}
            source={source}
            onSubmitted={refresh}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes de cada aba
// ---------------------------------------------------------------------------

function DetailsPanel({
  detail,
  isLoading,
}: {
  detail: ReportDetail | null;
  isLoading: boolean;
}) {
  if (isLoading && !detail) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!detail) {
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  }
  return (
    <>
      {detail.description && (
        <section>
          <h3 className="text-xs font-medium text-muted-foreground mb-1">Descrição</h3>
          <p className="text-sm whitespace-pre-wrap">{detail.description}</p>
        </section>
      )}

      {detail.photos.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            Fotos ({detail.photos.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {detail.photos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="block aspect-square overflow-hidden rounded-md border bg-muted"
              >
                <img
                  src={url}
                  alt="Foto do relato"
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {(detail.addressLine || detail.latitude !== null) && (
        <section>
          <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Localização
          </h3>
          {detail.addressLine && (
            <p className="text-sm">{detail.addressLine}</p>
          )}
          {detail.latitude !== null && detail.longitude !== null && (
            <a
              href={`https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              Abrir no Google Maps <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </section>
      )}

      {detail.extras.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Informações adicionais</h3>
          <dl className="space-y-1.5 text-sm">
            {detail.extras.map((e) => (
              <div key={e.label} className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="font-medium text-muted-foreground sm:min-w-[140px]">{e.label}</dt>
                <dd>{e.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="border-t pt-3 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Criado em {fmtDate(detail.createdAt)}
        </div>
        {detail.updatedAt && detail.updatedAt !== detail.createdAt && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Atualizado em {fmtDate(detail.updatedAt)}
          </div>
        )}
      </section>
    </>
  );
}

function AuthorPanel({
  author,
  isLoading,
}: {
  author: ReportAuthor | null;
  isLoading: boolean;
}) {
  if (isLoading && !author) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (!author) {
    return (
      <p className="text-sm text-muted-foreground">
        Autor anônimo ou perfil não disponível.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-muted overflow-hidden flex items-center justify-center">
          {author.avatarUrl ? (
            <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{author.fullName || "Sem nome"}</p>
          {author.phone && <p className="text-xs text-muted-foreground">{author.phone}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <DemoField label="Gênero" value={author.gender} />
        <DemoField label="Raça/Cor" value={author.race} />
        <DemoField label="Classe" value={author.socialClass} />
        <DemoField label="Idade" value={author.age !== null ? `${author.age} anos` : null} />
      </dl>

      {author.totalReports !== null && (
        <p className="text-xs text-muted-foreground border-t pt-2">
          Total de relatos do autor: <strong>{author.totalReports}</strong>
        </p>
      )}
    </div>
  );
}

function DemoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate">{value || "—"}</dd>
    </div>
  );
}

function AIPanel({
  detail,
  isLoading,
}: {
  detail: ReportDetail | null;
  isLoading: boolean;
}) {
  if (isLoading && !detail) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (!detail) return null;
  const ai = detail.aiAnalysis;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium">Análise da IA</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <DemoField label="Sentimento" value={ai.sentiment} />
        <DemoField label="Categoria validada" value={ai.category} />
        <DemoField label="Prioridade" value={ai.priority} />
        <DemoField
          label="Padrão detectado"
          value={ai.patternDetected !== null ? (ai.patternDetected ? "Sim" : "Não") : null}
        />
      </dl>

      {ai.tags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tags</p>
          <div className="flex flex-wrap gap-1">
            {ai.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {ai.rawClassification && Object.keys(ai.rawClassification).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Resposta bruta da classificação IA
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(ai.rawClassification, null, 2)}
          </pre>
        </details>
      )}

      {ai.enrichedData && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Dados enriquecidos pelo n8n
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(ai.enrichedData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function HistoryPanel({
  auditLog,
  comments,
  isLoading,
}: {
  auditLog: ReportAuditEntry[];
  comments: ReportComment[];
  isLoading: boolean;
}) {
  // Combina audit + comments numa timeline única ordenada por data desc
  const timeline = useMemo(() => {
    type Item = {
      kind: "audit" | "comment";
      createdAt: string;
      content: ReportAuditEntry | ReportComment;
    };
    const items: Item[] = [
      ...auditLog.map((a) => ({ kind: "audit" as const, createdAt: a.createdAt, content: a })),
      ...comments.map((c) => ({
        kind: "comment" as const,
        createdAt: c.createdAt ?? "",
        content: c,
      })),
    ];
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [auditLog, comments]);

  if (isLoading && timeline.length === 0) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem histórico de mudanças ou comentários.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {timeline.map((item, idx) => {
        if (item.kind === "comment") {
          const c = item.content as ReportComment;
          return (
            <li key={`c-${c.id}`} className="flex gap-2">
              <div className="flex flex-col items-center pt-1">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                {idx < timeline.length - 1 && <div className="flex-1 w-px bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-3">
                <p className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</p>
                <p className="text-sm whitespace-pre-wrap">{c.text}</p>
              </div>
            </li>
          );
        }
        const a = item.content as ReportAuditEntry;
        const oldStatus = a.oldValues?.status as string | undefined;
        const newStatus = a.newValues?.status as string | undefined;
        return (
          <li key={`a-${a.id}`} className="flex gap-2">
            <div className="flex flex-col items-center pt-1">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              {idx < timeline.length - 1 && <div className="flex-1 w-px bg-border mt-1" />}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <p className="text-xs text-muted-foreground">{fmtDate(a.createdAt)}</p>
              <p className="text-sm">
                <span className="font-medium">{a.action}</span>
                {oldStatus && newStatus && oldStatus !== newStatus && (
                  <>
                    : status mudou de <Badge variant="outline" className="text-[10px] ml-1">{statusLabel(oldStatus)}</Badge>{" "}
                    para <Badge variant="outline" className="text-[10px]">{statusLabel(newStatus)}</Badge>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Footer com ações administrativas
// ---------------------------------------------------------------------------

function ActionsFooter({
  detail,
  source,
  onChange,
  applyOptimisticDetail,
  applyOptimisticComment,
}: {
  detail: ReportDetail;
  source: ReportSource;
  onChange: () => Promise<void>;
  // HU-5.3 — callbacks de optimistic update (opcionais para compat).
  applyOptimisticDetail?: (patch: Partial<ReportDetail>) => void;
  applyOptimisticComment?: (comment: ReportComment) => void;
}) {
  const [newStatus, setNewStatus] = useState<string>(detail.status || "pending");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const handleStatusChange = async () => {
    if (newStatus === detail.status) return;
    // HU-5.3 — Optimistic update: aplica imediatamente, reverte em caso de erro.
    const previousStatus = detail.status;
    applyOptimisticDetail?.({ status: newStatus });
    setBusy(true);
    try {
      const tableName = source === "urban" ? "urban_reports" : "transport_reports";
      const { error } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq("id", detail.id);
      if (error) throw error;
      toast.success(`Status alterado para "${statusLabel(newStatus)}".`);
      // Não precisa await onChange() — o realtime/subscription já vai sincronizar
      // a fonte da verdade. O optimistic update já refletiu na UI.
      void onChange();
    } catch (err) {
      console.error("Erro ao mudar status", err);
      toast.error("Não foi possível alterar o status.");
      // Reverte optimistic update.
      applyOptimisticDetail?.({ status: previousStatus });
      setNewStatus(previousStatus);
    } finally {
      setBusy(false);
    }
  };

  const handleComment = async () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    // HU-5.3 — Optimistic insert: adiciona comentário temporário na lista.
    const tempComment: ReportComment = {
      id: `optimistic-${Date.now()}`,
      userId: null,
      authorName: "Você",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    applyOptimisticComment?.(tempComment);
    setComment("");
    setBusy(true);
    try {
      const tableName = source === "urban" ? "urban_report_comments" : "transport_report_comments";
      // RLS exige user_id = auth.uid(). O hook do client não preenche
      // automaticamente, então buscamos o usuário e incluímos no payload.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Sessão expirada — faça login novamente.");
      const { error } = await supabase.from(tableName).insert({
        report_id: detail.id,
        comment_text: trimmed,
        user_id: userId,
      });
      if (error) throw error;
      toast.success("Comentário adicionado.");
      // Realtime/refresh substituirá o comentário otimista pelo canônico.
      void onChange();
    } catch (err) {
      console.error("Erro ao adicionar comentário", err);
      toast.error("Não foi possível adicionar o comentário.");
      // Restaura o texto pro usuário corrigir e reverte o optimistic.
      setComment(trimmed);
      // Não temos um remove direto; o próximo onChange limpará o temporário.
      void onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Mudar status
          </label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleStatusChange}
          disabled={busy || newStatus === detail.status}
        >
          Aplicar
        </Button>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Adicionar comentário
        </label>
        <div className="flex gap-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anotação ou justificativa…"
            className="text-sm min-h-[60px] flex-1"
            disabled={busy}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleComment}
            disabled={busy || !comment.trim()}
            className="self-end"
            aria-label="Enviar comentário"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
