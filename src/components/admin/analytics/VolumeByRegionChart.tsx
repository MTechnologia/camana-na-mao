import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { useAnalyticsDrill } from "@/contexts/AnalyticsDrillContext";
import { useGlobalReportsAnalytics } from "@/contexts/GlobalReportsAnalyticsContext";
import { buildSentimentTreemapFromStats } from "@/lib/analyticsDrillFromStats";
import { metricLabel } from "@/lib/analyticsLabels";
import type { ChartBarPoint, SentimentTreemapCell } from "@/types/analyticsDrill";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParameterLegend } from "@/components/admin/analytics/ParameterLegend";
import { SentimentTreemap } from "@/components/admin/analytics/SentimentTreemap";
import { WordCloud } from "@/components/analytics/WordCloud";
import {
  CHART_PARAMETER_LEGENDS,
  SENTIMENT_POLARITY_PREPEND_SECTION,
} from "@/lib/analyticsParameterLegends";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function VolumeByRegionChart() {
  const { stats } = useGlobalReportsAnalytics();
  const keywords = stats?.keywords ?? [];

  const {
    chartData,
    grain,
    metric,
    activeRegion,
    activeDistrict,
    selectedBar,
    drillDown,
    openDrillThrough,
  } = useAnalyticsDrill();

  const isSentiment = metric === "sentiment";

  const sentimentTreemap = useMemo(() => {
    if (!isSentiment) return [];
    return buildSentimentTreemapFromStats(stats, grain, activeRegion, activeDistrict);
  }, [isSentiment, stats, grain, activeRegion, activeDistrict]);

  const title = isSentiment
    ? grain === "overview"
      ? "Polaridade por região"
      : grain === "region"
        ? "Polaridade por distrito (bairro)"
        : "Polaridade por logradouro"
    : grain === "overview"
      ? "Volume por região"
      : grain === "region"
        ? "Detalhe por distrito (bairro)"
        : "Detalhe por logradouro";

  const subtitle = isSentiment
    ? "Tamanho = volume · cor = sentimento médio · clique para ver o próximo nível"
    : "Clique em uma barra para ver o próximo nível · Selecione para abrir os relatos";

  const handleSentimentSelect = (cell: SentimentTreemapCell) => {
    drillDown({
      id: cell.id,
      label: cell.label,
      value: cell.volume,
      filterKey: cell.filterKey,
      filterValue: cell.filterValue,
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {selectedBar ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={openDrillThrough}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Ver relatos ({selectedBar.label})
            </Button>
          ) : null}
        </div>

        {isSentiment ? (
          sentimentTreemap.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Sem volume de relatos neste recorte.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <SentimentTreemap
                cells={sentimentTreemap}
                selectedId={selectedBar?.id}
                onSelect={handleSentimentSelect}
              />
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm font-medium text-foreground">Termos em destaque</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Palavras mais frequentes nas descrições do recorte, coloridas pelo sentimento.
                </p>
                {keywords.length > 0 ? (
                  <div className="h-[232px] overflow-y-auto">
                    <WordCloud words={keywords} />
                  </div>
                ) : (
                  <p className="flex h-[232px] items-center justify-center rounded-md border border-dashed border-border bg-background/50 px-4 text-center text-xs text-muted-foreground">
                    Sem termos suficientes neste recorte (depende de descrições e classificação dos
                    relatos).
                  </p>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={chartData.length > 4 ? -25 : 0}
                  textAnchor={chartData.length > 4 ? "end" : "middle"}
                  height={chartData.length > 4 ? 56 : 32}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  formatter={(value) => [
                    typeof value === "number" ? value.toLocaleString("pt-BR") : String(value ?? ""),
                    "Valor",
                  ]}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(bar) => {
                    const payload = bar?.payload as ChartBarPoint | undefined;
                    if (payload) drillDown(payload);
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke={selectedBar?.id === entry.id ? "hsl(var(--primary))" : undefined}
                      strokeWidth={selectedBar?.id === entry.id ? 2 : 0}
                      opacity={selectedBar && selectedBar.id !== entry.id ? 0.45 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <ParameterLegend
          className="mt-3"
          prependSection={isSentiment ? SENTIMENT_POLARITY_PREPEND_SECTION : undefined}
          items={
            isSentiment
              ? CHART_PARAMETER_LEGENDS.sentimentByRegion
              : [
                  ...CHART_PARAMETER_LEGENDS.executiveChart,
                  {
                    term: "Métrica ativa",
                    description: `${metricLabel(metric)} — define o valor numérico de cada barra no gráfico.`,
                  },
                ]
          }
        />
      </CardContent>
    </Card>
  );
}
