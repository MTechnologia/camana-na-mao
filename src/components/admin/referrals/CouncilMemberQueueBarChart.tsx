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
import { reportsManagementUrlForCouncilMember } from '@/lib/commissionFilterNavigation';
import type { CouncilMemberChartPoint } from '@/lib/councilMemberChart';
import { cn } from '@/lib/utils';

const ROW_HEIGHT_PX = 44;
const MIN_CHART_HEIGHT_PX = 280;

type BarClickPayload = { payload?: CouncilMemberChartPoint };

export function CouncilMemberQueueBarChart({
  data,
  className,
}: {
  data: CouncilMemberChartPoint[];
  className?: string;
}) {
  const navigate = useNavigate();
  const { period, region, category } = useGlobalFilters();
  const chartHeight = Math.max(MIN_CHART_HEIGHT_PX, data.length * ROW_HEIGHT_PX);

  const yAxisWidth = useMemo(() => {
    const maxChars = Math.max(...data.map((d) => d.fullName.length), 12);
    return Math.min(260, Math.max(120, Math.ceil(maxChars * 5.8)));
  }, [data]);

  const handleBarClick = (bar: BarClickPayload) => {
    const id = bar?.payload?.id;
    if (!id) return;
    navigate(
      reportsManagementUrlForCouncilMember(id, {
        queueTab: 'all',
        global: { period, region, category },
      }),
    );
  };

  if (data.length === 0) {
    return (
      <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Nenhum encaminhamento neste recorte.
      </p>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
          barCategoryGap="32%"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelFormatter={(_, items) => {
              const row = (items?.[0]?.payload ?? null) as CouncilMemberChartPoint | null;
              return row?.fullName ?? '';
            }}
            formatter={(v) => [formatChartNumber(Number(v)), 'Em andamento']}
          />
          <Bar
            dataKey="value"
            name="Em andamento"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={handleBarClick}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.id}
                fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]}
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
