import { AnalyticsDrillBreadcrumb } from '@/components/admin/analytics/AnalyticsDrillBreadcrumb';
import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import { UrbanAnalyticsExploreLinks } from '@/components/admin/urban-analytics/UrbanAnalyticsExploreLinks';
import { URBAN_REPORTS_ANALYTICS_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { UrbanAnalyticsKpiStrip } from '@/components/admin/urban-analytics/UrbanAnalyticsKpiStrip';
import { UrbanAnalyticsPageHeader } from '@/components/admin/urban-analytics/UrbanAnalyticsPageHeader';
import { UrbanAnalyticsTabs } from '@/components/admin/urban-analytics/UrbanAnalyticsTabs';

export function ReportsAnalyticsPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <UrbanAnalyticsPageHeader />

      <AnalyticsDrillBreadcrumb variant="compact" />

      <UrbanAnalyticsKpiStrip />

      <UrbanAnalyticsTabs />

      <PageUsageGuideFooter
        items={URBAN_REPORTS_ANALYTICS_PAGE_LEGENDS}
        pageName="Análise de relatos urbanos"
      >
        <UrbanAnalyticsExploreLinks />
      </PageUsageGuideFooter>
    </div>
  );
}
