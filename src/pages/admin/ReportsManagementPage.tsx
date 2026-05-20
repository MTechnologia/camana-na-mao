import { Link } from 'react-router-dom';
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
  } = useUrbanReportsManagement();

  return (
    <PageShell
      title="Gestão de relatos urbanos"
      titleInfo={URBAN_REPORTS_MANAGEMENT_PAGE_LEGEND}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/referrals?tab=fluxo">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Análise de Encaminhamentos
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
      />

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
      />
    </PageShell>
  );
}
