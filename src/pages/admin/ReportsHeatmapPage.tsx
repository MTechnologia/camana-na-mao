import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/ui/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HEATMAP_METRICS,
  RN_MAP_001_HEATMAP_PAGE_LEGEND,
  type HeatmapMetricId,
} from "@/lib/analyticsParameterLegends";
import { UsageHeatmapPanel } from "@/components/admin/heatmap/UsageHeatmapPanel";
import { RatingsConcentrationPanel } from "@/components/admin/heatmap/RatingsConcentrationPanel";
import { IntensityDemandPanel } from "@/components/admin/heatmap/IntensityDemandPanel";
import { WaitTimeHeatmapPanel } from "@/components/admin/heatmap/WaitTimeHeatmapPanel";

const DEFAULT_METRIC: HeatmapMetricId = "uso";

function isHeatmapMetricId(value: string | null): value is HeatmapMetricId {
  return HEATMAP_METRICS.some((m) => m.id === value);
}

export function ReportsHeatmapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const metricParam = searchParams.get("metric");
  const activeMetric = isHeatmapMetricId(metricParam) ? metricParam : DEFAULT_METRIC;

  useEffect(() => {
    if (metricParam && !isHeatmapMetricId(metricParam)) {
      setSearchParams({ metric: DEFAULT_METRIC }, { replace: true });
    }
  }, [metricParam, setSearchParams]);

  return (
    <PageShell title="Mapa de calor" titleInfo={RN_MAP_001_HEATMAP_PAGE_LEGEND}>
      <Tabs
        value={activeMetric}
        onValueChange={(value) => setSearchParams({ metric: value }, { replace: true })}
        className="w-full"
      >
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap gap-1 p-1">
            {HEATMAP_METRICS.map((m) => (
              <TabsTrigger
                key={m.id}
                value={m.id}
                className="shrink-0 whitespace-nowrap px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {HEATMAP_METRICS.map((m) => (
          <TabsContent
            key={m.id}
            value={m.id}
            className="mt-4 min-h-[280px] focus-visible:outline-none"
          >
            {m.id === "uso" && <UsageHeatmapPanel />}
            {m.id === "avaliacoes" && <RatingsConcentrationPanel />}
            {m.id === "demanda" && <IntensityDemandPanel colorBy="volume" />}
            {m.id === "espera" && <WaitTimeHeatmapPanel />}
          </TabsContent>
        ))}
      </Tabs>
    </PageShell>
  );
}
