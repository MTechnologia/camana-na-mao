import { Map } from 'lucide-react';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { heatmapChartLegend, heatmapMetricLabel } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

type HeatmapMapSlotProps = {
  metric: string;
  className?: string;
};

/**
 * Área reservada para o mapa de calor geográfico (MapLibre / Leaflet).
 * Mantém proporção e altura mínima estáveis para integração futura.
 */
export function HeatmapMapSlot({ metric, className }: HeatmapMapSlotProps) {
  const metricName = heatmapMetricLabel(metric);
  const legend = heatmapChartLegend(metric);

  return (
    <section
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/25',
        'min-h-[min(56vh,520px)] lg:min-h-[min(62vh,560px)]',
        className,
      )}
      aria-label={`Área do mapa de calor — ${metricName}`}
      data-heatmap-map-slot
      data-metric={metric}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-card/60 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Map className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">Mapa territorial</p>
            <p className="truncate text-xs text-muted-foreground">{metricName}</p>
          </div>
          <ParameterInfoListTrigger
            items={legend}
            tooltipTitle="Parâmetros do mapa"
            ariaLabel={`Parâmetros do mapa: ${metricName}`}
          />
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Em integração
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Map className="h-7 w-7" aria-hidden />
        </div>
        <p className="max-w-md text-sm font-medium text-foreground">
          Camada de mapa — {metricName}
        </p>
        <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
          Espaço reservado para mapa de calor interativo sobre a cidade de São Paulo (tiles
          agregados por região). Integração prevista com MapLibre ou Leaflet.
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          Os filtros globais (período, região e categoria) serão aplicados à camada do mapa.
        </p>
      </div>

      {/* Container interno para futura montagem do mapa (100% largura/altura útil) */}
      <div
        id="heatmap-map-root"
        className="pointer-events-none absolute inset-0 top-[49px] opacity-0"
        aria-hidden
      />
    </section>
  );
}
