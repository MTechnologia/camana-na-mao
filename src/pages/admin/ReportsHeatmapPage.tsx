import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import { HeatmapExploreLinks } from '@/components/admin/heatmap-page/HeatmapExploreLinks';
import { HeatmapMetricTabs } from '@/components/admin/heatmap-page/HeatmapMetricTabs';
import { HeatmapPageHeader } from '@/components/admin/heatmap-page/HeatmapPageHeader';
import { HEATMAP_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';

export function ReportsHeatmapPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <HeatmapPageHeader />
      <HeatmapMetricTabs />
      <PageUsageGuideFooter items={HEATMAP_PAGE_LEGENDS} pageName="Mapa de calor">
        <HeatmapExploreLinks />
      </PageUsageGuideFooter>
    </div>
  );
}
