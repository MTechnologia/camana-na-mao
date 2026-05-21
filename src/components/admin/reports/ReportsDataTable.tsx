import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_LABELS, STAGE_LABELS } from '@/lib/urbanReportLabels';
import type { ReportPriority, ReportWorkflowStage, UrbanReportRecord } from '@/types/urbanReportManagement';
import { cn } from '@/lib/utils';

const STAGE_VARIANT: Record<
  ReportWorkflowStage,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  awaiting_triage: 'destructive',
  triaged: 'secondary',
  referred: 'default',
  in_analysis: 'outline',
  resolved: 'secondary',
};

const PRIORITY_CLASS: Record<ReportPriority, string> = {
  urgent: 'border-destructive/40 bg-destructive/10 text-destructive',
  high: 'border-primary/30 bg-primary/10 text-primary',
  normal: 'border-border bg-muted/50 text-foreground',
  low: 'border-border bg-muted/30 text-muted-foreground',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReportsDataTable({
  rows,
  selectedId,
  onSelect,
  embedded = false,
}: {
  rows: UrbanReportRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Dentro de um bloco único da página — sem card externo duplicado. */
  embedded?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div
        className={
          embedded
            ? 'px-6 py-12 text-center text-sm text-muted-foreground'
            : 'rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground'
        }
      >
        Nenhum relato neste recorte. Ajuste os filtros globais ou troque de aba.
      </div>
    );
  }

  const table = (
    <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Protocolo</th>
              <th className="px-4 py-3 font-medium">Relato</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Região</th>
              <th className="px-4 py-3 font-medium">Atualizado</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = r.id === selectedId;
              return (
                <tr
                  key={r.id}
                  className={cn(
                    'cursor-pointer border-b border-border transition-colors hover:bg-muted/40',
                    active && 'bg-primary/5',
                  )}
                  onClick={() => onSelect(r.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.protocol}</td>
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="truncate font-medium text-foreground">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.priority ? (
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase',
                          PRIORITY_CLASS[r.priority],
                        )}
                      >
                        {PRIORITY_LABELS[r.priority]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STAGE_VARIANT[r.stage]}>{STAGE_LABELS[r.stage]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.region}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );

  if (embedded) return table;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {table}
    </div>
  );
}
