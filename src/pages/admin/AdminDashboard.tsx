import { ExecutiveChartSection } from '@/components/admin/executive/ExecutiveChartSection';
import { ExecutiveDashboardHeader } from '@/components/admin/executive/ExecutiveDashboardHeader';
import { ExecutiveExploreLinks } from '@/components/admin/executive/ExecutiveExploreLinks';
import { ExecutiveKpiStrip } from '@/components/admin/executive/ExecutiveKpiStrip';
import { ExecutiveTerritoryNav } from '@/components/admin/executive/ExecutiveTerritoryNav';
import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import {
  EXECUTIVE_DASHBOARD_PAGE_LEGENDS,
  EXECUTIVE_HOMOLOGATION_LEGENDS,
} from '@/lib/analyticsParameterLegends';

/**
 * Home do gestor — leitura executiva em três camadas:
 * contexto (header), indicadores (faixa), território (gráfico + drill).
 */
export function AdminDashboard() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <ExecutiveDashboardHeader />

      <ExecutiveTerritoryNav />

      <ExecutiveKpiStrip />

      <ExecutiveChartSection />

      <PageUsageGuideFooter
        items={EXECUTIVE_DASHBOARD_PAGE_LEGENDS}
        homologationItems={EXECUTIVE_HOMOLOGATION_LEGENDS}
        pageName="Visão executiva"
      >
        <ExecutiveExploreLinks />
      </PageUsageGuideFooter>
    </div>
  );
}
