import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard, ChartHeight } from '@/components/admin/analytics/ChartCard';
import {
  CHART_COLORS,
  chartTooltipStyle,
  formatChartNumber,
} from '@/components/admin/analytics/chartTheme';
import { useSectionChartData } from '@/hooks/useSectionChartData';
import { SECTION_CHART_LEGENDS } from '@/lib/analyticsParameterLegends';
import type { LabeledValue } from '@/lib/chartTypes';

function ExecutiveBarBlock({
  data,
  colorIndex = 1,
}: {
  data: LabeledValue[];
  colorIndex?: number;
}) {
  return (
    <ChartHeight>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={data.length > 5 ? -25 : 0}
            textAnchor={data.length > 5 ? 'end' : 'middle'}
            height={data.length > 5 ? 52 : 30}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v) => formatChartNumber(Number(v))}
          />
          <Bar
            dataKey="value"
            name="Quantidade"
            fill={CHART_COLORS[colorIndex % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartHeight>
  );
}

/**
 * Gráficos complementares do dashboard executivo — mesma lógica do dev (ExecutiveDashboardCharts),
 * com ChartCard/ChartHeight do layout atual.
 */
export function ExecutiveSupplementaryCharts() {
  const { metricTrends, volumeByCategory } = useSectionChartData();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Quatro indicadores no tempo"
        subtitle="Comparativo no recorte selecionado"
        legend={SECTION_CHART_LEGENDS.metricTrends}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metricTrends} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="volume"
                name="Volume"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot
              />
              <Line
                type="monotone"
                dataKey="sentiment"
                name="Sentimento %"
                stroke={CHART_COLORS[1]}
                strokeWidth={2}
                dot
              />
              <Line
                type="monotone"
                dataKey="patterns"
                name="Padrões"
                stroke={CHART_COLORS[3]}
                strokeWidth={2}
                dot
              />
              <Line
                type="monotone"
                dataKey="response"
                name="Resposta (h)"
                stroke={CHART_COLORS[2]}
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>

      <ChartCard
        title="Volume por categoria"
        subtitle="Distribuição no período"
        legend={SECTION_CHART_LEGENDS.volumeByCategory}
      >
        <ExecutiveBarBlock
          data={volumeByCategory.map((r) => ({ label: r.label, value: r.value }))}
          colorIndex={1}
        />
      </ChartCard>
    </div>
  );
}
