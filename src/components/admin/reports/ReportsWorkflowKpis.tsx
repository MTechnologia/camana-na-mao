import { KpiCard } from '@/components/ui/KpiCard';
import { REPORTS_WORKFLOW_KPI_LEGENDS } from '@/lib/analyticsParameterLegends';
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
  const items: { tab: ReportQueueTab; label: string; value: number; legend: keyof typeof REPORTS_WORKFLOW_KPI_LEGENDS }[] = [
    { tab: 'triage', label: 'Aguardando triagem', value: counts.awaiting_triage, legend: 'awaitingTriage' },
    { tab: 'tracking', label: 'Triados (sem envio)', value: counts.triaged, legend: 'triaged' },
    { tab: 'referrals', label: 'Em encaminhamento', value: counts.referred + counts.in_analysis, legend: 'inReferral' },
    { tab: 'all', label: 'Concluídos', value: counts.resolved, legend: 'resolved' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          className={cn('text-left', queueTab === item.tab && 'ring-2 ring-primary ring-offset-2 rounded-xl')}
          onClick={() => onSelectTab(item.tab)}
        >
          <KpiCard
            label={item.label}
            value={item.value.toLocaleString('pt-BR')}
            parameter={REPORTS_WORKFLOW_KPI_LEGENDS[item.legend]}
            stopParameterPropagation
          />
        </button>
      ))}
    </div>
  );
}
