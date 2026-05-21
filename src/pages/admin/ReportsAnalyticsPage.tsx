import type React from 'react';
import { PageShell } from '@/components/ui/PageShell';
import { URBAN_REPORTS_ANALYTICS_PAGE_LEGEND } from '@/lib/analyticsParameterLegends';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrbanReportsAnalyticsFilterBar } from '@/components/admin/analytics/UrbanReportsAnalyticsFilterBar';
import { AnalyticsSummaryKpis } from '@/components/admin/analytics/AnalyticsSummaryKpis';
import { UrbanReportsAnalyticsFiltersProvider } from '@/contexts/UrbanReportsAnalyticsFiltersContext';
import {
  AiInsightsPanel,
  CorrelationTabPanel,
  PatternsTabPanel,
  SentimentTabPanel,
  TerritoryTabPanel,
  VolumeTabPanel,
} from '@/components/admin/analytics/AnalyticsTabPanels';

const tabs = [
  { id: 'volume', label: 'Volume' },
  { id: 'sentimento', label: 'Sentimento' },
  { id: 'padroes', label: 'Padrões' },
  { id: 'correlacao', label: 'Correlação' },
  { id: 'territorio', label: 'Território' },
  { id: 'ia', label: 'Inteligência artificial' },
] as const;

const tabPanels: Record<(typeof tabs)[number]['id'], () => React.ReactElement> = {
  volume: VolumeTabPanel,
  sentimento: SentimentTabPanel,
  padroes: PatternsTabPanel,
  correlacao: CorrelationTabPanel,
  territorio: TerritoryTabPanel,
  ia: AiInsightsPanel,
};

export function ReportsAnalyticsPage() {
  return (
    <UrbanReportsAnalyticsFiltersProvider>
      <PageShell title="Análise de relatos urbanos" titleInfo={URBAN_REPORTS_ANALYTICS_PAGE_LEGEND}>
        <UrbanReportsAnalyticsFilterBar />
        <AnalyticsSummaryKpis />

        <Tabs defaultValue="volume" className="mt-6 w-full">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap gap-1 p-1 md:w-full md:max-w-full">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="shrink-0 whitespace-nowrap px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((t) => {
          const Panel = tabPanels[t.id];
          return (
            <TabsContent key={t.id} value={t.id} className="mt-4 min-h-[280px] focus-visible:outline-none">
              <Panel />
            </TabsContent>
          );
        })}
        </Tabs>
      </PageShell>
    </UrbanReportsAnalyticsFiltersProvider>
  );
}
