import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendChartRow } from '@/lib/buildTrendChartRows';

const STROKES = [
  'hsl(var(--primary))',
  'hsl(199 89% 48%)',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(0 84% 60%)',
  'hsl(210 90% 55%)',
  'hsl(330 70% 55%)',
  'hsl(160 60% 40%)',
  'hsl(25 95% 53%)',
  'hsl(250 60% 55%)',
  'hsl(80 50% 45%)',
];

type TrendCategoryLineChartProps = {
  data: TrendChartRow[];
  categoryKeys: string[];
  emptyMessage?: string;
};

export function TrendCategoryLineChart({
  data,
  categoryKeys,
  emptyMessage = 'Sem dados para o período e filtros selecionados.',
}: TrendCategoryLineChartProps) {
  if (!data.length || !categoryKeys.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="bucketLabel" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {categoryKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={STROKES[i % STROKES.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
