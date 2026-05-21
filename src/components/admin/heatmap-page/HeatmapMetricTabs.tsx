import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  HEATMAP_METRICS,
  type HeatmapMetricId,
} from '@/lib/analyticsParameterLegends';
import { UsageHeatmapPanel } from '@/components/admin/heatmap/UsageHeatmapPanel';
import { RatingsConcentrationPanel } from '@/components/admin/heatmap/RatingsConcentrationPanel';
import { IntensityDemandPanel } from '@/components/admin/heatmap/IntensityDemandPanel';
import { WaitTimeHeatmapPanel } from '@/components/admin/heatmap/WaitTimeHeatmapPanel';

const DEFAULT_METRIC: HeatmapMetricId = 'uso';

const METRIC_SHORT: Record<HeatmapMetricId, string> = {
  uso: 'Uso',
  avaliacoes: 'Aval.',
  demanda: 'Demanda',
  espera: 'Espera',
};

function isHeatmapMetricId(value: string | null): value is HeatmapMetricId {
  return HEATMAP_METRICS.some((m) => m.id === value);
}

export function HeatmapMetricTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const metricParam = searchParams.get('metric');
  const activeMetric = isHeatmapMetricId(metricParam) ? metricParam : DEFAULT_METRIC;

  useEffect(() => {
    if (metricParam && !isHeatmapMetricId(metricParam)) {
      setSearchParams({ metric: DEFAULT_METRIC }, { replace: true });
    }
  }, [metricParam, setSearchParams]);

  return (
    <section aria-label="Métricas do mapa de calor" className="space-y-4">
      <Tabs
        value={activeMetric}
        onValueChange={(value) => setSearchParams({ metric: value }, { replace: true })}
        className="w-full"
      >
        <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-4">
            {HEATMAP_METRICS.map((m) => (
              <TabsTrigger
                key={m.id}
                value={m.id}
                className={cn(
                  'h-9 shrink-0 rounded-md px-2 text-xs font-medium sm:text-sm',
                  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                )}
              >
                <span className="sm:hidden">{METRIC_SHORT[m.id]}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Card>

        <TabsContent value="uso" className="mt-4 min-h-[280px] focus-visible:outline-none">
          <UsageHeatmapPanel />
        </TabsContent>
        <TabsContent value="avaliacoes" className="mt-4 min-h-[280px] focus-visible:outline-none">
          <RatingsConcentrationPanel />
        </TabsContent>
        <TabsContent value="demanda" className="mt-4 min-h-[280px] focus-visible:outline-none">
          <IntensityDemandPanel colorBy="volume" />
        </TabsContent>
        <TabsContent value="espera" className="mt-4 min-h-[280px] focus-visible:outline-none">
          <WaitTimeHeatmapPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}
