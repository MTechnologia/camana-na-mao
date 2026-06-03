import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/lib/urbanReportLabels";
import { TRIAGE_PRIORITIES } from "@/lib/triage";
import type { ReportWorkflowStage, UrbanReportRecord } from "@/types/urbanReportManagement";
import { cn } from "@/lib/utils";

const STAGE_VARIANT: Record<
  ReportWorkflowStage,
  "default" | "secondary" | "outline" | "destructive"
> = {
  awaiting_triage: "destructive",
  triaged: "secondary",
  referred: "default",
  in_analysis: "outline",
  resolved: "secondary",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportsDataTable({
  rows,
  selectedId,
  onSelect,
  footer,
}: {
  rows: UrbanReportRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  footer?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        Nenhum relato neste recorte. Ajuste os filtros globais ou troque de aba.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Protocolo</th>
              <th className="px-4 py-3 font-medium">Relato</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Região</th>
              <th className="px-4 py-3 font-medium">Atualizado</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = r.id === selectedId;
              const rowKey = r.councilReferralId ?? r.id;
              return (
                <tr
                  key={rowKey}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors hover:bg-muted/40",
                    active && "bg-primary/5",
                  )}
                  onClick={() => onSelect(r.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {r.protocol}
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="truncate font-medium text-foreground">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.triagePriority ? (
                      <span
                        className={cn(
                          "inline-flex rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                          TRIAGE_PRIORITIES[r.triagePriority].bgClass,
                          TRIAGE_PRIORITIES[r.triagePriority].colorClass,
                        )}
                      >
                        {r.triagePriority}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Badge variant={STAGE_VARIANT[r.stage]} className="w-fit">
                        {STAGE_LABELS[r.stage]}
                      </Badge>
                      {r.councilReferralStatusLabel ? (
                        <span className="text-[10px] text-muted-foreground">
                          {r.councilReferralStatusLabel}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-muted-foreground">
                    <span
                      className="line-clamp-2 text-xs"
                      title={
                        r.responsibleName && r.councilMemberName
                          ? `${r.responsibleName} · ${r.councilMemberName}`
                          : (r.responsibleName ?? r.councilMemberName ?? undefined)
                      }
                    >
                      {r.responsibleName ?? "—"}
                    </span>
                    {r.responsibleName && r.councilMemberName ? (
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/80">
                        {r.councilMemberName}
                      </span>
                    ) : !r.responsibleName && r.councilMemberName ? (
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/80">
                        {r.councilMemberName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.region}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(r.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
