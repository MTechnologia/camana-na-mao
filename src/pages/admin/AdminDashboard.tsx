import { PageShell } from "@/components/ui/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXECUTIVE_DASHBOARD_PAGE_LEGEND } from "@/lib/analyticsParameterLegends";
import { DashboardHelpSection } from "@/components/admin/DashboardHelpSection";
import { AnalyticsDrillBreadcrumb } from "@/components/admin/analytics/AnalyticsDrillBreadcrumb";
import { ExecutiveKpiSection } from "@/components/admin/analytics/ExecutiveKpiSection";
import { MetricSwitcher } from "@/components/admin/analytics/MetricSwitcher";
import { VolumeByRegionChart } from "@/components/admin/analytics/VolumeByRegionChart";
import { ExecutiveDashboardCharts } from "@/components/admin/charts/SectionChartPanels";
import { ExecutiveCrossAnalyticsSection } from "@/components/admin/analytics/ExecutiveCrossAnalyticsSection";
import { ExecutivePeriodCompareSection } from "@/components/admin/analytics/ExecutivePeriodCompareSection";

export function AdminDashboard() {
  return (
    <PageShell title="Dashboard executivo" titleInfo={EXECUTIVE_DASHBOARD_PAGE_LEGEND}>
      <AnalyticsDrillBreadcrumb />

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Visão geral
          </TabsTrigger>
          <TabsTrigger
            value="cross"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Cruzamento analítico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <ExecutiveKpiSection />

          <ExecutivePeriodCompareSection />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              O cartão selecionado acima define a métrica exibida no gráfico, sem perder o recorte.
            </p>
            <MetricSwitcher />
          </div>

          <VolumeByRegionChart />

          <ExecutiveDashboardCharts />

          <DashboardHelpSection />
        </TabsContent>

        <TabsContent value="cross" className="mt-4">
          <ExecutiveCrossAnalyticsSection />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
