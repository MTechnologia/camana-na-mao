export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: "hsl(var(--chart-5))",
  neutral: "hsl(var(--chart-2))",
  negative: "hsl(var(--chart-1))",
};

export const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
} as const;

export function formatChartNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

/** Rótulo do valor no mapa de calor conforme a métrica RN-MAP-001. */
export function formatHeatmapMetricValue(value: number, metricId: string): string {
  if (metricId === "espera") return `${formatChartNumber(value)} min`;
  if (metricId === "uso") return `${formatChartNumber(value)} pessoas`;
  return formatChartNumber(value);
}
