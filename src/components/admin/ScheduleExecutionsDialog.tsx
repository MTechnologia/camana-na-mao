import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ScheduledExport } from "@/hooks/useScheduledExports";
import type { ExportJobStatus } from "@/hooks/useExportJobs";
import { cn } from "@/lib/utils";

/**
 * HU-8.1 — Histórico de execuções (export_jobs) de um agendamento específico.
 *
 * Lista os 30 jobs mais recentes com scheduled_export_id = X. Permite baixar
 * o arquivo gerado (signed URL) ou ver o erro quando falhou.
 */

interface JobRow {
  id: string;
  status: ExportJobStatus;
  rowCount: number | null;
  storagePath: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  source: string;
}

interface ScheduleExecutionsDialogProps {
  schedule: ScheduledExport | null;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_BUCKET = "export-files" as const;
const SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

const STATUS_META: Record<
  ExportJobStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "Aguardando", color: "text-muted-foreground", icon: Clock },
  running: { label: "Processando", color: "text-blue-600", icon: Loader2 },
  completed: { label: "Concluído", color: "text-green-600", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "text-destructive", icon: XCircle },
  cancelled: { label: "Cancelado", color: "text-muted-foreground", icon: X },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min atrás`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.round(h / 24);
  return `${d}d atrás`;
}

export function ScheduleExecutionsDialog({
  schedule,
  onOpenChange,
}: ScheduleExecutionsDialogProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const open = !!schedule;

  const fetchJobs = useCallback(async () => {
    if (!schedule || !userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("export_jobs")
        .select(
          "id, status, row_count, storage_path, error, created_at, started_at, completed_at, source",
        )
        .eq("user_id", userId)
        .eq("scheduled_export_id", schedule.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setJobs(
        (data ?? []).map((r) => ({
          id: r.id as string,
          status: r.status as ExportJobStatus,
          rowCount: r.row_count as number | null,
          storagePath: r.storage_path as string | null,
          error: r.error as string | null,
          createdAt: r.created_at as string,
          startedAt: r.started_at as string | null,
          completedAt: r.completed_at as string | null,
          source: r.source as string,
        })),
      );
    } catch (err) {
      console.error("[ScheduleExecutionsDialog] fetch error", err);
    } finally {
      setIsLoading(false);
    }
  }, [schedule, userId]);

  useEffect(() => {
    if (open) {
      void fetchJobs();
    } else {
      setJobs([]);
    }
  }, [open, fetchJobs]);

  // Realtime — atualiza enquanto o usuário está olhando.
  useRealtimeRefresh(["export_jobs"], fetchJobs);

  const handleDownload = async (job: JobRow) => {
    if (!job.storagePath) return;
    setDownloading(job.id);
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(job.storagePath, SIGNED_URL_EXPIRES_SECONDS);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (err) {
      toast.error("Não foi possível gerar link de download.");
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const summary = useMemo(() => {
    if (jobs.length === 0) return null;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    return { total: jobs.length, completed, failed };
  }, [jobs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de execuções</DialogTitle>
          <DialogDescription>
            {schedule
              ? `Últimas 30 execuções do agendamento "${schedule.name}".`
              : "Selecione um agendamento."}
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">Total: {summary.total}</Badge>
            <Badge variant="outline" className="text-green-600 border-green-600/40">
              ✓ {summary.completed} concluídas
            </Badge>
            {summary.failed > 0 && (
              <Badge variant="outline" className="text-destructive border-destructive/40">
                ✗ {summary.failed} falharam
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-2">
          {isLoading && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : jobs.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma execução registrada ainda.
            </Card>
          ) : (
            jobs.map((j) => {
              const meta = STATUS_META[j.status];
              const Icon = meta.icon;
              return (
                <Card key={j.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        meta.color,
                        j.status === "running" && "animate-spin",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(j.createdAt)}
                        </span>
                        {j.rowCount !== null && (
                          <span className="text-xs text-muted-foreground">
                            · {j.rowCount.toLocaleString("pt-BR")} linhas
                          </span>
                        )}
                      </div>
                      {j.error && (
                        <p className="text-xs text-destructive mt-1 break-words">{j.error}</p>
                      )}
                    </div>
                    {j.status === "completed" && j.storagePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => void handleDownload(j)}
                        disabled={downloading === j.id}
                      >
                        {downloading === j.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
