import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HeatmapFiltersBarProps = {
  children: ReactNode;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
};

export function HeatmapFiltersBar({
  children,
  onRefresh,
  isLoading,
  className,
}: HeatmapFiltersBarProps) {
  return (
    <section
      aria-label="Filtros do mapa"
      className={cn(
        'rounded-xl border border-border/80 bg-card/60 p-3 shadow-sm backdrop-blur-sm md:p-4',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">{children}</div>
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 shadow-sm"
            onClick={() => void onRefresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Atualizar
          </Button>
        ) : null}
      </div>
    </section>
  );
}
