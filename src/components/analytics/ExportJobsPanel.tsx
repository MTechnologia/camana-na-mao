import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Download, Loader2, Trash2, X, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useExportJobs, type ExportJob, type ExportJobStatus } from "@/hooks/useExportJobs";
import { cn } from "@/lib/utils";

/**
 * HU-7.4 + HU-7.5 — Painel lateral "Minhas exportações".
 *
 * Lista os 50 últimos jobs do usuário com status visual:
 *   - pending → reloginho ⏳
 *   - running → spinner
 *   - completed → ícone verde + botão Download
 *   - failed → ícone vermelho + mensagem
 *   - cancelled → riscado
 *
 * Atualizado em realtime via useExportJobs (que assina export_jobs).
 */

interface ExportJobsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function ExportJobsPanel({ open, onOpenChange }: ExportJobsPanelProps) {
  const { jobs, isLoading, cancel, remove, getSignedUrl } = useExportJobs();
  const [downloading, setDownloading] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const active = jobs.filter((j) => j.status === "pending" || j.status === "running");
    const recent = jobs.filter((j) => j.status !== "pending" && j.status !== "running");
    return { active, recent };
  }, [jobs]);

  const handleDownload = async (job: ExportJob) => {
    setDownloading(job.id);
    const url = await getSignedUrl(job);
    setDownloading(null);
    if (!url) {
      toast.error("Não foi possível gerar o link de download.");
      return;
    }
    // Abre em nova aba pra preservar a sessão
    window.open(url, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Minhas exportações</SheetTitle>
          <SheetDescription>
            Exportações server-side e agendadas. Arquivos ficam disponíveis por 7 dias.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {isLoading && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : jobs.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma exportação ainda.
            </Card>
          ) : (
            <>
              {grouped.active.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Em andamento
                  </div>
                  {grouped.active.map((j) => (
                    <JobCard
                      key={j.id}
                      job={j}
                      onCancel={() => void cancel(j.id)}
                      onDownload={() => void handleDownload(j)}
                      onRemove={() => void remove(j.id)}
                      downloading={downloading === j.id}
                    />
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Recentes
                </div>
                {grouped.recent.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    onCancel={() => void cancel(j.id)}
                    onDownload={() => void handleDownload(j)}
                    onRemove={() => void remove(j.id)}
                    downloading={downloading === j.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface JobCardProps {
  job: ExportJob;
  onDownload: () => void;
  onCancel: () => void;
  onRemove: () => void;
  downloading: boolean;
}

function JobCard({ job, onDownload, onCancel, onRemove, downloading }: JobCardProps) {
  const meta = STATUS_META[job.status];
  const Icon = meta.icon;
  const datasetLabel =
    job.dataset === "urban_reports"
      ? "Urbano"
      : job.dataset === "transport_reports"
        ? "Transporte"
        : job.dataset;

  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            meta.color,
            job.status === "running" && "animate-spin",
          )}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {datasetLabel} — {job.format.toUpperCase()}
            </span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {meta.label}
            </Badge>
            {job.source === "scheduled" && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                Agendada
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Criado {formatRelative(job.createdAt)}
            {job.rowCount !== null && <> · {job.rowCount.toLocaleString("pt-BR")} linhas</>}
          </div>
          {job.error && <p className="text-xs text-destructive mt-1 break-words">{job.error}</p>}
        </div>

        <div className="flex flex-col gap-1">
          {job.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={onDownload}
              disabled={downloading}
              title="Baixar"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {(job.status === "pending" || job.status === "running") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onCancel}
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {(job.status === "completed" ||
            job.status === "failed" ||
            job.status === "cancelled") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={onRemove}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
