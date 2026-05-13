import { useMemo } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  History,
  PenSquare,
  Send,
  UserCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useReportStatusEvents,
  type ReportEventType,
  type ReportStatusEvent,
} from "@/hooks/useReportStatusEvents";
import {
  useCommissionReferrals,
} from "@/hooks/useCommissionReferrals";
import {
  useReportTriage,
} from "@/hooks/useReportTriage";
import { TRIAGE_PRIORITIES, TRIAGE_STATUSES } from "@/lib/triage";
import type { ReportSource } from "@/contexts/ReportDetailContext";

/**
 * HU-10.3 — Aba "Acompanhamento" no ReportDetailSheet.
 *
 * Mostra:
 *   1. Resumo atual: status do funil, prioridade, responsável.
 *   2. Encaminhamentos a comissões (com status).
 *   3. Timeline vertical com todos os eventos do ciclo de vida.
 */

interface ReportTimelineTabProps {
  reportId: string;
  source: ReportSource;
}

const EVENT_ICONS: Record<ReportEventType, typeof FileText> = {
  created: FileText,
  triaged: UserCheck,
  assigned: UserCheck,
  prioritized: AlertCircle,
  referred: Send,
  status_changed: ArrowRight,
  note_added: PenSquare,
  resolved: CheckCircle2,
  reopened: Edit3,
};

const EVENT_COLORS: Record<ReportEventType, string> = {
  created: "bg-muted text-muted-foreground",
  triaged: "bg-blue-100 text-blue-700",
  assigned: "bg-blue-100 text-blue-700",
  prioritized: "bg-amber-100 text-amber-800",
  referred: "bg-purple-100 text-purple-700",
  status_changed: "bg-indigo-100 text-indigo-700",
  note_added: "bg-muted text-muted-foreground",
  resolved: "bg-green-100 text-green-700",
  reopened: "bg-orange-100 text-orange-700",
};

function eventLabel(event: ReportStatusEvent): string {
  const data = event.eventData;
  switch (event.eventType) {
    case "created":
      return "Relato registrado";
    case "triaged":
      return "Triagem iniciada";
    case "assigned": {
      const to = data?.to as string | null;
      return to ? "Responsável atribuído" : "Responsável removido";
    }
    case "prioritized": {
      const to = data?.to as string | null;
      const from = data?.from as string | null;
      if (!from && to) return `Prioridade definida como ${to}`;
      if (from && to) return `Prioridade alterada: ${from} → ${to}`;
      return "Prioridade removida";
    }
    case "referred":
      return "Encaminhado a comissão temática";
    case "status_changed": {
      const to = (data?.to as string | null) ?? "—";
      const meta = (TRIAGE_STATUSES as Record<string, { label: string }>)[to];
      return `Status alterado para ${meta?.label ?? to}`;
    }
    case "note_added":
      return "Nota interna adicionada";
    case "resolved":
      return "Marcado como resolvido";
    case "reopened":
      return "Reaberto";
    default:
      return event.eventType;
  }
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ReportTimelineTab({
  reportId,
  source,
}: ReportTimelineTabProps) {
  const { triage, isLoading: loadingTriage } = useReportTriage(reportId, source);
  const { events, isLoading: loadingEvents } = useReportStatusEvents(
    reportId,
    source,
  );
  const { referrals, isLoading: loadingReferrals } = useCommissionReferrals(
    reportId,
    source,
  );

  const isLoading = loadingTriage || loadingEvents || loadingReferrals;

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
      ),
    [events],
  );

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo do funil */}
      <Card className="p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          Estado atual
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {TRIAGE_STATUSES[triage?.triageStatus ?? "untriaged"].label}
          </Badge>
          {triage?.priority && (
            <Badge
              className={cn(
                "border-none",
                TRIAGE_PRIORITIES[triage.priority].bgClass,
                TRIAGE_PRIORITIES[triage.priority].colorClass,
              )}
            >
              {TRIAGE_PRIORITIES[triage.priority].label}
            </Badge>
          )}
          {triage?.assigneeId ? (
            <Badge variant="outline" className="text-xs">
              <UserCheck className="h-3 w-3 mr-1" />
              Atribuído
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Sem responsável
            </Badge>
          )}
        </div>
      </Card>

      {/* Encaminhamentos */}
      {referrals.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Send className="h-3 w-3" />
            Encaminhamentos ({referrals.length})
          </p>
          <ul className="space-y-2">
            {referrals.map((r) => (
              <li key={r.id} className="text-xs border-l-2 border-primary/30 pl-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {r.commissionName ?? "(comissão)"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.status === "pending"
                      ? "Pendente"
                      : r.status === "accepted"
                        ? "Aceito"
                        : r.status === "rejected"
                          ? "Rejeitado"
                          : "Processado"}
                  </Badge>
                </div>
                <p className="text-muted-foreground italic mt-0.5 line-clamp-2">
                  &quot;{r.justification}&quot;
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {fmt(r.referredAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Timeline */}
      <Card className="p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
          <History className="h-3 w-3" />
          Histórico ({sortedEvents.length})
        </p>
        {sortedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Sem eventos registrados ainda. A timeline é populada conforme
            a triagem avança.
          </p>
        ) : (
          <ol className="relative border-l-2 border-border space-y-3 pl-4">
            {sortedEvents.map((ev) => {
              const Icon = EVENT_ICONS[ev.eventType] ?? FileText;
              const colorClass = EVENT_COLORS[ev.eventType] ?? "bg-muted";
              return (
                <li key={ev.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[22px] top-0 h-5 w-5 rounded-full flex items-center justify-center",
                      colorClass,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <p className="text-xs font-medium">{eventLabel(ev)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmt(ev.occurredAt)}
                    {ev.actorName && ` · ${ev.actorName}`}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
