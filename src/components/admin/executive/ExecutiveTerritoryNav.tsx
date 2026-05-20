import { ChevronRight, MapPin, Undo2 } from 'lucide-react';
import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ExecutiveTerritoryNav() {
  const { drillPath, drillUp, clearDrill, grain } = useAnalyticsDrill();
  const { region, category } = useGlobalFilters();

  const hasTerritoryContext =
    drillPath.length > 1 || grain !== 'overview' || region !== 'all' || category !== 'all';

  if (!hasTerritoryContext) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-2 sm:items-center">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mt-0">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Território em foco
          </p>
          <nav
            aria-label="Navegação territorial"
            className="mt-0.5 flex flex-wrap items-center gap-1 text-sm"
          >
            {drillPath.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
                ) : null}
                {i === drillPath.length - 1 ? (
                  <span className="font-semibold text-foreground">{crumb.label}</span>
                ) : (
                  <button
                    type="button"
                    className="rounded-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => drillUp(i)}
                  >
                    {crumb.label}
                  </button>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 bg-background/80 shadow-sm"
        onClick={clearDrill}
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        Visão da capital
      </Button>
    </div>
  );
}
