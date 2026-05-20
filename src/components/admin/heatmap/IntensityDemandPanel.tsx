import { useMemo, useState } from 'react';
import { Activity, Clock, MapPinned } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { IntensityDemandMap, type IntensityMapColorBy } from '@/components/admin/IntensityDemandMap';
import { HeatmapFiltersBar } from '@/components/admin/heatmap-page/HeatmapFiltersBar';
import { HeatmapMetricsStrip } from '@/components/admin/heatmap-page/HeatmapMetricsStrip';
import { HeatmapPanelShell } from '@/components/admin/heatmap-page/HeatmapPanelShell';
import {
  useIntensityDemand,
  type IntensityPeriod,
  type IntensityScope,
  type ZoneIntensity,
} from '@/hooks/useIntensityDemand';

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}

type Props = {
  colorBy?: IntensityMapColorBy;
};

export function IntensityDemandPanel({ colorBy = 'volume' }: Props) {
  const [period, setPeriod] = useState<IntensityPeriod>('90d');
  const [scope, setScope] = useState<IntensityScope>('all');
  const [selected, setSelected] = useState<ZoneIntensity | null>(null);

  const { zones, summary, isLoading, error, refresh } = useIntensityDemand({ period, scope });

  const summaryCells = useMemo(() => {
    if (zones.length === 0) return [];
    return [
      { label: 'Zonas com dados', value: zones.length },
      { label: 'Total de relatos', value: summary.totalReports },
      {
        label: 'Tempo médio geral',
        value: formatHours(summary.avgWaitHours),
        accentClass: summary.avgWaitHours >= 168 ? 'text-destructive' : 'text-amber-600',
      },
      {
        label: 'Zona mais crítica',
        value: summary.worstZone?.zone ?? '—',
        accentClass: 'text-destructive',
        compact: true,
      },
    ];
  }, [zones.length, summary]);

  const filters = (
    <HeatmapFiltersBar onRefresh={refresh} isLoading={isLoading}>
      <div className="space-y-1.5">
        <Label htmlFor="intensity-period" className="text-xs font-medium text-muted-foreground">
          Período
        </Label>
        <Select value={period} onValueChange={(v) => setPeriod(v as IntensityPeriod)}>
          <SelectTrigger id="intensity-period" className="h-9 bg-background">
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
      <div className="space-y-1.5">
        <Label htmlFor="intensity-scope" className="text-xs font-medium text-muted-foreground">
          Tipo de relato
        </Label>
        <Select value={scope} onValueChange={(v) => setScope(v as IntensityScope)}>
          <SelectTrigger id="intensity-scope" className="h-9 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Urbanos + Transporte</SelectItem>
            <SelectItem value="urban">Apenas urbanos</SelectItem>
            <SelectItem value="transport">Apenas transporte</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </HeatmapFiltersBar>
  );

  const rankingAside =
    zones.length > 0 ? (
      <Card className="border-border/80 p-4 shadow-sm md:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Clock className="h-4 w-4" aria-hidden />
          Ranking de zonas por prioridade
        </h2>
        <ul className="divide-y divide-border">
          {zones.map((z) => (
            <li
              key={z.zone}
              className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-2 hover:bg-muted/40"
              onClick={() => setSelected(z)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(z);
                }
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <MapPinned className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{z.zone}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {z.count} relatos · {z.resolved} resolvidos · {z.pending} pendentes
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right text-xs">
                <div className="font-bold tabular-nums">{z.priorityScore}/100</div>
                <div className="text-muted-foreground">⏱ {formatHours(z.avgWaitHours)}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    ) : null;

  const detailAside = selected ? (
    <Card className="border-primary/40 p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4" aria-hidden />
            {selected.zone}
          </h3>
          <p className="text-xs text-muted-foreground">Detalhes da zona selecionada</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          Fechar
        </Button>
      </div>
      <HeatmapMetricsStrip
        cells={[
          { label: 'Volume', value: selected.count },
          { label: 'Tempo médio', value: formatHours(selected.avgWaitHours) },
          { label: 'Score', value: `${selected.priorityScore}/100` },
          {
            label: '% resolvido',
            value: `${selected.count > 0 ? Math.round((selected.resolved / selected.count) * 100) : 0}%`,
            accentClass: 'text-emerald-600',
          },
        ]}
      />
    </Card>
  ) : null;

  return (
    <HeatmapPanelShell
      metricId="demanda"
      subtitle={
        colorBy === 'volume'
          ? 'Tamanho e cor pelo volume de relatos urbanos e de transporte'
          : 'Tamanho pelo volume; cor pelo tempo médio de atendimento'
      }
      filters={
        <>
          {filters}
          {summaryCells.length > 0 ? (
            <HeatmapMetricsStrip cells={summaryCells} isLoading={isLoading} />
          ) : null}
        </>
      }
      error={error}
      aside={
        <>
          {rankingAside}
          {detailAside}
        </>
      }
      footer={
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Legenda:</span>
          {colorBy === 'volume' ? (
            <>
              <Badge style={{ backgroundColor: 'hsl(120,75%,45%)', color: 'white' }}>Baixa demanda</Badge>
              <Badge style={{ backgroundColor: 'hsl(0,75%,45%)', color: 'white' }}>Alta demanda</Badge>
            </>
          ) : (
            <>
              <Badge style={{ backgroundColor: 'hsl(120,75%,45%)', color: 'white' }}>&lt; 24h</Badge>
              <Badge style={{ backgroundColor: 'hsl(60,75%,45%)', color: 'black' }}>~3 dias</Badge>
              <Badge style={{ backgroundColor: 'hsl(0,75%,45%)', color: 'white' }}>≥ 1 semana</Badge>
            </>
          )}
        </div>
      }
    >
      {isLoading && zones.length === 0 ? (
        <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
      ) : (
        <IntensityDemandMap zones={zones} colorBy={colorBy} onSelect={setSelected} />
      )}
    </HeatmapPanelShell>
  );
}
