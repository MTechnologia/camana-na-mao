import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type HeatmapMetricCell = {
  label: string;
  value: string | number;
  accentClass?: string;
  compact?: boolean;
};

type HeatmapMetricsStripProps = {
  cells: HeatmapMetricCell[];
  isLoading?: boolean;
};

export function HeatmapMetricsStrip({ cells, isLoading }: HeatmapMetricsStripProps) {
  if (!cells.length) return null;

  const colClass =
    cells.length <= 3
      ? 'sm:grid-cols-2 xl:grid-cols-3'
      : 'sm:grid-cols-2 xl:grid-cols-4';

  return (
    <section aria-label="Resumo do recorte">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div
          className={cn(
            'grid grid-cols-1 divide-y divide-border',
            colClass,
            'sm:divide-x sm:divide-y-0',
          )}
        >
          {cells.map((cell) => (
            <div
              key={cell.label}
              className={cn('px-4 py-3.5', isLoading && 'animate-pulse')}
            >
              <p className="text-xs font-medium text-muted-foreground">{cell.label}</p>
              <p
                className={cn(
                  'mt-0.5 font-semibold tabular-nums tracking-tight',
                  cell.compact ? 'text-base leading-snug' : 'text-2xl',
                  cell.accentClass,
                )}
              >
                {isLoading ? '…' : cell.value}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
