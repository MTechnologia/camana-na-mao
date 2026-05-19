import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RegionSentimentBreakdown } from '@/types/analyticsDrill';
import {
  SENTIMENT_COLORS,
  chartTooltipStyle,
} from '@/components/admin/analytics/chartTheme';
import { cn } from '@/lib/utils';

type SentimentPolarityPiesGridProps = {
  items: RegionSentimentBreakdown[];
  selectedId?: string;
  onItemClick?: (item: RegionSentimentBreakdown) => void;
  className?: string;
};

export function SentimentPolarityPiesGrid({
  items,
  selectedId,
  onItemClick,
  className,
}: SentimentPolarityPiesGridProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'grid gap-3',
        items.length === 1
          ? 'grid-cols-1 max-w-xs mx-auto'
          : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        className,
      )}
    >
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const interactive = Boolean(onItemClick);

        return (
          <div
            key={item.id}
            className={cn(
              'flex flex-col rounded-lg border border-border/80 bg-muted/15 p-2',
              interactive && 'cursor-pointer transition-colors hover:bg-muted/30',
              isSelected && 'border-primary ring-1 ring-primary/30',
            )}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onItemClick?.(item) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onItemClick?.(item);
                    }
                  }
                : undefined
            }
          >
            <p className="mb-1 truncate text-center text-xs font-medium text-foreground">
              {item.label}
            </p>
            <div className="h-[168px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={item.slices}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={62}
                    paddingAngle={2}
                  >
                    {item.slices.map((slice) => (
                      <Cell
                        key={slice.id}
                        fill={SENTIMENT_COLORS[slice.id] ?? 'hsl(var(--chart-3))'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, name) => [`${value}%`, String(name)]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10 }}
                    iconSize={8}
                    layout="horizontal"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
