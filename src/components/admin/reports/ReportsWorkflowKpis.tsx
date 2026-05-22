import { Card } from '@/components/ui/card';
import type { ReportQueueTab } from '@/types/urbanReportManagement';
import { cn } from '@/lib/utils';

export function ReportsWorkflowKpis({
  counts,
  queueTab,
  onSelectTab,
}: {
  counts: ReturnType<typeof import('@/lib/urbanReportLabels').countByStage>;
  queueTab: ReportQueueTab;
  onSelectTab: (tab: ReportQueueTab) => void;
}) {
  const items: { tab: ReportQueueTab; label: string; value: number }[] = [
    { tab: 'triage', label: 'Aguardando triagem', value: counts.awaiting_triage },
    { tab: 'tracking', label: 'Triados (sem envio)', value: counts.triaged },
    {
      tab: 'referrals',
      label: 'Em encaminhamento',
      value: counts.referred + counts.in_analysis,
    },
    { tab: 'all', label: 'Concluídos', value: counts.resolved },
  ];

  return (
    <section aria-label="Indicadores da fila operacional">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {items.map((item) => {
            const selected = queueTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                className={cn(
                  'relative flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors',
                  'hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  selected && 'bg-primary/[0.06]',
                )}
                onClick={() => onSelectTab(item.tab)}
                aria-pressed={selected}
              >
                {selected ? (
                  <span
                    className="absolute inset-y-0 left-0 w-0.5 bg-primary sm:inset-x-0 sm:bottom-auto sm:top-0 sm:h-0.5 sm:w-auto"
                    aria-hidden
                  />
                ) : null}
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {item.value.toLocaleString('pt-BR')}
                </p>
              </button>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
