import { PageShell } from '@/components/ui/PageShell';
import { EXECUTIVE_DASHBOARD_PAGE_LEGEND } from '@/lib/analyticsParameterLegends';
import { DashboardHelpSection } from '@/components/admin/DashboardHelpSection';
import { AnalyticsDrillBreadcrumb } from '@/components/admin/analytics/AnalyticsDrillBreadcrumb';
import { ExecutiveKpiSection } from '@/components/admin/analytics/ExecutiveKpiSection';
import { MetricSwitcher } from '@/components/admin/analytics/MetricSwitcher';
import { VolumeByRegionChart } from '@/components/admin/analytics/VolumeByRegionChart';
import { ExecutiveDashboardCharts } from '@/components/admin/charts/SectionChartPanels';

export function AdminDashboard() {
  return (
    <PageShell title="Dashboard executivo" titleInfo={EXECUTIVE_DASHBOARD_PAGE_LEGEND}>
      <AnalyticsDrillBreadcrumb />

      <ExecutiveKpiSection />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          O cartão selecionado acima define a métrica exibida no gráfico, sem perder o recorte.
        </p>
        <MetricSwitcher />
      </div>

      <div className="mt-4">
        <VolumeByRegionChart />
      </div>

      <ExecutiveDashboardCharts />

      <DashboardHelpSection />
    </PageShell>
  );
}
