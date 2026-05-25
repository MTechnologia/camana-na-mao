import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { parseGlobalFiltersFromSearchParams } from '@/lib/commissionFilterNavigation';
import { ExternalLink } from 'lucide-react';
import { ReportDetailSheet } from '@/components/admin/reports/ReportDetailSheet';
import { ReportsDataTable } from '@/components/admin/reports/ReportsDataTable';
import { ReportsQueueToolbar } from '@/components/admin/reports/ReportsQueueToolbar';
import { ReportsWorkflowBanner } from '@/components/admin/reports/ReportsWorkflowBanner';
import { ReportsWorkflowKpis } from '@/components/admin/reports/ReportsWorkflowKpis';
import { ReportsManagementChartSection } from '@/components/admin/charts/SectionChartPanels';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/PageShell';
import { useUrbanReportsManagement } from '@/hooks/useUrbanReportsManagement';
import { URBAN_REPORTS_MANAGEMENT_PAGE_LEGEND } from '@/lib/analyticsParameterLegends';

export function ReportsManagementPage() {
  const [searchParams] = useSearchParams();
  const { setPeriod, setRegion, setCategory } = useGlobalFilters();

  useEffect(() => {
    const fromUrl = parseGlobalFiltersFromSearchParams(searchParams);
    if (fromUrl.period) setPeriod(fromUrl.period);
    if (fromUrl.region) setRegion(fromUrl.region);
    if (fromUrl.category) setCategory(fromUrl.category);
  }, [searchParams, setPeriod, setRegion, setCategory]);

  const {
    filtered,
    counts,
    queueTab,
    setQueueTab,
    search,
    setSearch,
    selected,
    selectedId,
    setSelectedId,
    updateReport,
    savingId,
    onTriageCommitted,
    responsibleCatalog,
    selectedResponsibleIds,
    responsiblePopoverOpen,
    setResponsiblePopoverOpen,
    toggleResponsible,
    clearResponsibleFilter,
    selectedPriorities,
    priorityPopoverOpen,
    setPriorityPopoverOpen,
    togglePriority,
    clearPriorityFilter,
    councilReferralFilterLabel,
    councilReferralStats,
  } = useUrbanReportsManagement();

  return (
    <PageShell
      title="Gestão de relatos urbanos"
      titleInfo={URBAN_REPORTS_MANAGEMENT_PAGE_LEGEND}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/referrals?tab=fluxo">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Análise de encaminhamentos
          </Link>
        </Button>
      }
    >
      <ReportsWorkflowBanner />

      <ReportsWorkflowKpis
        counts={counts}
        queueTab={queueTab}
        onSelectTab={setQueueTab}
      />

      <ReportsQueueToolbar
        queueTab={queueTab}
        onTabChange={setQueueTab}
        search={search}
        onSearchChange={setSearch}
        resultCount={filtered.length}
        responsibleCatalog={responsibleCatalog}
        selectedResponsibleIds={selectedResponsibleIds}
        responsiblePopoverOpen={responsiblePopoverOpen}
        onResponsiblePopoverOpenChange={setResponsiblePopoverOpen}
        onToggleResponsible={toggleResponsible}
        onClearResponsibleFilter={clearResponsibleFilter}
        selectedPriorities={selectedPriorities}
        priorityPopoverOpen={priorityPopoverOpen}
        onPriorityPopoverOpenChange={setPriorityPopoverOpen}
        onTogglePriority={togglePriority}
        onClearPriorityFilter={clearPriorityFilter}
        councilReferralFilterLabel={councilReferralFilterLabel}
        councilReferralStats={councilReferralStats}
      />

      {councilReferralStats && councilReferralStats.nonUrban > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {councilReferralStats.nonUrban} encaminhamento
          {councilReferralStats.nonUrban === 1 ? '' : 's'} pendente
          {councilReferralStats.nonUrban === 1 ? ' é' : 's são'} de transporte ou avaliação de
          serviço — não aparecem nesta fila urbana. O total de {councilReferralStats.referralTotal}{' '}
          bate com a análise de encaminhamentos.
        </p>
      ) : null}

      <ReportsDataTable
        rows={filtered}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <ReportsManagementChartSection />

      <ReportDetailSheet
        report={selected}
        saving={Boolean(selected && savingId === selected.id)}
        onClose={() => setSelectedId(null)}
        onUpdate={updateReport}
        onTriageCommitted={async (saved) => {
          if (!selectedId) return;
          await onTriageCommitted(selectedId, saved);
        }}
      />
    </PageShell>
  );
}
