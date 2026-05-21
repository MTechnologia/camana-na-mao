import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { IntensityDemandMap, colorForWait } from '@/components/admin/IntensityDemandMap';
import type { ZoneIntensity } from '@/hooks/useIntensityDemand';
import { HeatmapFiltersBar } from '@/components/admin/heatmap-page/HeatmapFiltersBar';
import { HeatmapMetricsStrip } from '@/components/admin/heatmap-page/HeatmapMetricsStrip';
import { HeatmapPanelShell } from '@/components/admin/heatmap-page/HeatmapPanelShell';
import { useWaitTimeByZone, type WaitTimePeriod } from '@/hooks/useWaitTimeByZone';

function scoreToHours(score: number): number {
  return ((5 - score) / 4) * 168;
}

export function WaitTimeHeatmapPanel() {
  const [period, setPeriod] = useState<WaitTimePeriod>('90d');
  const { zones, summary, isLoading, error, refresh } = useWaitTimeByZone({ period });

  const mapZones: ZoneIntensity[] = useMemo(
    () =>
      zones.map((z) => ({
        zone: z.zone,
        count: z.count,
        avgWaitHours: scoreToHours(z.avgWaitScore),
        resolved: 0,
        pending: 0,
        rejected: 0,
        priorityScore: Math.round(z.avgWaitScore * 20),
        lat: z.lat,
        lng: z.lng,
      })),
    [zones],
  );

  const summaryCells = useMemo(() => {
    if (zones.length === 0) return [];
    return [
      { label: 'Avaliações com tempo', value: summary.totalRatings },
      {
        label: 'Média do recorte',
        value: `${summary.avgScore.toFixed(1)}/5`,
        accentClass: 'text-amber-600',
      },
      {
        label: 'Zona com maior espera',
        value: summary.worstZone?.zone ?? '—',
        accentClass: 'text-destructive',
        compact: true,
      },
    ];
  }, [zones.length, summary]);

  const filters = (
    <HeatmapFiltersBar onRefresh={refresh} isLoading={isLoading}>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="wait-period" className="text-xs font-medium text-muted-foreground">
          Período
        </Label>
        <Select value={period} onValueChange={(v) => setPeriod(v as WaitTimePeriod)}>
          <SelectTrigger id="wait-period" className="h-9 max-w-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </HeatmapFiltersBar>
  );

  return (
    <HeatmapPanelShell
      metricId="espera"
      subtitle="Média do tempo de espera informado nas avaliações, por zona"
      filters={
        <>
          {filters}
          {summaryCells.length > 0 ? (
            <HeatmapMetricsStrip cells={summaryCells} isLoading={isLoading} />
          ) : null}
        </>
      }
      error={error}
      footer={
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">Legenda (faixa informada):</span>
          <Badge style={{ backgroundColor: colorForWait(24), color: 'white' }}>Espera menor</Badge>
          <Badge style={{ backgroundColor: colorForWait(120), color: 'black' }}>Intermediária</Badge>
          <Badge style={{ backgroundColor: colorForWait(168), color: 'white' }}>Espera maior</Badge>
        </div>
      }
    >
      {isLoading && zones.length === 0 ? (
        <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
      ) : (
        <IntensityDemandMap zones={mapZones} colorBy="wait" onSelect={() => undefined} />
      )}
    </HeatmapPanelShell>
  );
}
