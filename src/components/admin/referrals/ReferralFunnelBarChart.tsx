import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import {
  CHART_COLORS,
  chartTooltipStyle,
  formatChartNumber,
} from '@/components/admin/analytics/chartTheme';
import {
  councilReferralFilterFromFunnelLabel,
  reportsManagementUrlForCouncilReferral,
  type CouncilReferralFilter,
} from '@/lib/commissionFilterNavigation';
import type { LabeledValue } from '@/lib/chartTypes';
import { cn } from '@/lib/utils';

const ROW_HEIGHT_PX = 44;
const MIN_CHART_HEIGHT_PX = 220;

type FunnelPoint = LabeledValue & { filter: CouncilReferralFilter | null };

function funnelPoints(data: LabeledValue[]): FunnelPoint[] {
  return data.map((d) => ({
    ...d,
    filter: councilReferralFilterFromFunnelLabel(d.label),
  }));
}

type BarClickPayload = { payload?: FunnelPoint };

/** Funil de encaminhamentos a vereadores — clique abre Gestão de relatos filtrada. */
export function ReferralFunnelBarChart({
  data,
  className,
}: {
  data: LabeledValue[];
  className?: string;
}) {
  const navigate = useNavigate();
  const { period, region, category } = useGlobalFilters();
  const points = useMemo(() => funnelPoints(data), [data]);
  const chartHeight = Math.max(MIN_CHART_HEIGHT_PX, points.length * ROW_HEIGHT_PX);

  const handleBarClick = (bar: BarClickPayload) => {
    const filter = bar?.payload?.filter;
    if (!filter) return;
    navigate(
      reportsManagementUrlForCouncilReferral(filter, {
        queueTab: 'all',
        global: { period, region, category },
      }),
    );
  };

  if (points.length === 0) {
    return (
      <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Nenhum encaminhamento neste recorte.
      </p>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={points}
          layout="vertical"
          margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
          barCategoryGap="32%"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={108}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v) => [formatChartNumber(Number(v)), 'Quantidade']}
          />
          <Bar
            dataKey="value"
            name="Quantidade"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={handleBarClick}
          >
            {points.map((entry, i) => (
              <Cell
                key={entry.label}
                fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
