import { useMemo } from "react";
import {
  Activity,
  CalendarRange,
  Clock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useReportDetailModal } from "@/contexts/ReportDetailContext";
import { usePatternReports, type PatternReportEntry } from "@/hooks/usePatternReports";
import type { PatternEntry } from "@/hooks/usePatternsList";
import { cn } from "@/lib/utils";

/**
 * HU-9.1 — Painel lateral com detalhes de um padrão + lista de relatos
 * que o compõem. Cada relato clicável abre o ReportDetailSheet global.
 */

interface PatternDetailSheetProps {
  pattern: PatternEntry | null;
  onOpenChange: (open: boolean) => void;
}

const PATTERN_TYPE_LABELS: Record<string, string> = {
  volume_spike: "Pico de volume",
  recurrent_issue: "Recorrência",
  hotspot: "Concentração local",
  trend: "Tendência",
  anomaly: "Anomalia",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.round(h / 24);
  return `${d}d atrás`;
}

function PeakHoursMini({ peakHours }: { peakHours: number[] | null }) {
  const vec = useMemo(() => {
    const v = Array.from({ length: 24 }, () => 0);
    if (peakHours) for (const h of peakHours) if (h >= 0 && h <= 23) v[h] = 1;
    return v;
  }, [peakHours]);

  return (
    <div className="grid grid-cols-12 gap-0.5">
      {vec.map((on, i) => (
        <div
          key={i}
          className={cn(
            "h-3 rounded-sm text-[8px] flex items-center justify-center",
            on ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
          title={`${i}h`}
        >
          {on ? i : ""}
        </div>
      ))}
    </div>
  );
}

export function PatternDetailSheet({ pattern, onOpenChange }: PatternDetailSheetProps) {
  const { reports, isLoading } = usePatternReports(pattern);
  const { open: openReport } = useReportDetailModal();
  const open = pattern !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        {pattern && (
          <>
            <SheetHeader className="space-y-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {PATTERN_TYPE_LABELS[pattern.patternType] ?? pattern.patternType}
                </Badge>
                {pattern.averageSeverity && (
                  <Badge variant="secondary" className="text-[10px]">
                    Severidade: {pattern.averageSeverity}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-base leading-snug">
                {pattern.description}
              </SheetTitle>
              {pattern.suggestedAction && (
                <SheetDescription className="flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span>{pattern.suggestedAction}</span>
                </SheetDescription>
              )}
            </SheetHeader>

            {/* Metadados em cards compactos */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Card className="p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                  Ocorrências
                </div>
                <div className="text-lg font-semibold flex items-center gap-1">
                  <Activity className="h-4 w-4 text-primary" />
                  {pattern.occurrenceCount}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                  Última vez
                </div>
                <div className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {formatRelative(pattern.lastOccurrenceAt)}
                </div>
              </Card>
            </div>

            <Card className="p-3 mb-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <CalendarRange className="h-3.5 w-3.5" />
                Janela de observação
              </div>
              <div className="text-xs space-y-0.5">
                <div>
                  <span className="text-muted-foreground">Início:</span>{" "}
                  <span className="font-medium">{formatDate(pattern.windowStart)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fim:</span>{" "}
                  <span className="font-medium">{formatDate(pattern.windowEnd)}</span>
                </div>
                {pattern.firstDetectedAt && (
                  <div>
                    <span className="text-muted-foreground">Primeira detecção:</span>{" "}
                    <span className="font-medium">{formatDate(pattern.firstDetectedAt)}</span>
                  </div>
                )}
              </div>
            </Card>

            {pattern.peakHours && pattern.peakHours.length > 0 && (
              <Card className="p-3 mb-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                  Horários de pico (24h)
                </div>
                <PeakHoursMini peakHours={pattern.peakHours} />
              </Card>
            )}

            {/* Relatos associados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Relatos relacionados
                </div>
                {!isLoading && (
                  <Badge variant="secondary" className="text-[10px]">
                    {reports.length} {reports.length === 1 ? "relato" : "relatos"}
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando relatos...</p>
              ) : reports.length === 0 ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum relato encontrado na janela do padrão.
                </Card>
              ) : (
                <div className="space-y-1.5">
                  {reports.slice(0, 50).map((r) => (
                    <ReportRow
                      key={`${r.source}-${r.id}`}
                      report={r}
                      onClick={() => {
                        openReport(r.id, r.source);
                      }}
                    />
                  ))}
                  {reports.length > 50 && (
                    <p className="text-[11px] text-muted-foreground text-center pt-1">
                      Mostrando os 50 mais recentes de {reports.length} relatos.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ReportRowProps {
  report: PatternReportEntry;
  onClick: () => void;
}

function ReportRow({ report, onClick }: ReportRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-md border border-border hover:bg-muted/40 transition-colors flex items-start gap-2 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {report.source === "urban" ? "Urbano" : "Transporte"}
          </Badge>
          {report.protocol && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {report.protocol}
            </span>
          )}
          {report.severity && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {report.severity}
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium mt-0.5 truncate">{report.title}</p>
        {report.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {report.description}
          </p>
        )}
        <div className="text-[11px] text-muted-foreground mt-1">
          {report.neighborhood && <span>📍 {report.neighborhood} · </span>}
          {report.lineName && <span>🚌 {report.lineName} · </span>}
          {new Date(report.createdAt).toLocaleDateString("pt-BR")}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
    </button>
  );
}
