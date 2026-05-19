import { TrendingDown, TrendingUp } from 'lucide-react';
import type { RegionPatternSummary } from '@/types/analyticsDrill';
import { formatChartNumber } from '@/components/admin/analytics/chartTheme';
import { cn } from '@/lib/utils';

type PatternsByRegionListProps = {
  items: RegionPatternSummary[];
  className?: string;
};

function TrendBadge({ trendPct }: { trendPct: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        trendPct >= 0 ? 'bg-emerald-500/15 text-emerald-800' : 'bg-destructive/15 text-destructive',
      )}
    >
      {trendPct >= 0 ? (
        <TrendingUp className="h-3 w-3" aria-hidden />
      ) : (
        <TrendingDown className="h-3 w-3" aria-hidden />
      )}
      {trendPct >= 0 ? '+' : ''}
      {trendPct}%
    </span>
  );
}

export function PatternsByRegionList({ items, className }: PatternsByRegionListProps) {
  if (items.length === 0) return null;

  return (
    <section className={className} aria-labelledby="patterns-by-region-heading">
      <h3
        id="patterns-by-region-heading"
        className="mb-3 text-sm font-medium text-foreground"
      >
        Padrão predominante por região
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map((region) => (
          <li
            key={region.regionId}
            className="flex flex-col rounded-lg border border-border bg-muted/20 p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {region.regionLabel}
            </p>
            <p className="mt-2 text-sm font-medium leading-snug text-foreground">
              {region.primaryPattern}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">
                  {formatChartNumber(region.count)}
                </span>{' '}
                ocorrências
              </span>
              <TrendBadge trendPct={region.trendPct} />
            </div>
            {region.secondary.length > 0 ? (
              <ul className="mt-3 space-y-1.5 border-t border-border/70 pt-2">
                {region.secondary.map((item, secIdx) => (
                  <li
                    key={`${region.regionId}-sec-${secIdx}`}
                    className="flex items-start justify-between gap-2 text-[11px]"
                  >
                    <span className="leading-snug text-muted-foreground">{item.label}</span>
                    <span className="shrink-0 tabular-nums font-medium text-foreground">
                      {formatChartNumber(item.count)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
