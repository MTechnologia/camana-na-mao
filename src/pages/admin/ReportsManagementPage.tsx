import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { ReportDetailSheet } from '@/components/admin/reports/ReportDetailSheet';
import { ReportsDataTable } from '@/components/admin/reports/ReportsDataTable';
import { ReportsQueueToolbar } from '@/components/admin/reports/ReportsQueueToolbar';
import { ReportsWorkflowBanner } from '@/components/admin/reports/ReportsWorkflowBanner';
import { ReportsWorkflowKpis } from '@/components/admin/reports/ReportsWorkflowKpis';
import { ReportsManagementChartSection } from '@/components/admin/charts/SectionChartPanels';
import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import { UrbanReportsExploreLinks } from '@/components/admin/urban-reports/UrbanReportsExploreLinks';
import { URBAN_REPORTS_MANAGEMENT_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { UrbanReportsPageHeader } from '@/components/admin/urban-reports/UrbanReportsPageHeader';
import { UrbanReportsSubNav } from '@/components/admin/urban-reports/UrbanReportsSubNav';
import { Button } from '@/components/ui/button';
import { useUrbanReportsManagement } from '@/hooks/useUrbanReportsManagement';

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
  } = useUrbanReportsManagement();

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <UrbanReportsPageHeader
        title="Gestão de relatos"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm" asChild>
            <Link to="/admin/referrals?tab=fluxo">
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              Encaminhamentos
            </Link>
          </Button>
        }
      />

      <UrbanReportsSubNav />

      <ReportsWorkflowKpis counts={counts} queueTab={queueTab} onSelectTab={setQueueTab} />

      <ReportsWorkflowBanner />

      <section
        aria-label="Fila de relatos"
        className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
      >
        <div className="px-4 pt-4 md:px-5">
          <ReportsQueueToolbar
            queueTab={queueTab}
            onTabChange={setQueueTab}
            search={search}
            onSearchChange={setSearch}
            resultCount={filtered.length}
          />
        </div>
        <ReportsDataTable
          rows={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          embedded
        />
      </section>

      <ReportsManagementChartSection />

      <PageUsageGuideFooter
        items={URBAN_REPORTS_MANAGEMENT_PAGE_LEGENDS}
        pageName="Gestão de relatos"
      >
        <UrbanReportsExploreLinks />
      </PageUsageGuideFooter>

      <ReportDetailSheet
        report={selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(updated) => {
          updateReport(updated);
        }}
      />
    </div>
  );
}
