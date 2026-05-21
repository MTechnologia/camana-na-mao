import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
import { RatingsBubbleMap } from '@/components/admin/RatingsBubbleMap';
import { ServiceRatingsDetailSheet } from '@/components/admin/ServiceRatingsDetailSheet';
import { HeatmapFiltersBar } from '@/components/admin/heatmap-page/HeatmapFiltersBar';
import { HeatmapMetricsStrip } from '@/components/admin/heatmap-page/HeatmapMetricsStrip';
import { HeatmapPanelShell } from '@/components/admin/heatmap-page/HeatmapPanelShell';
import {
  useRatingsConcentration,
  type RatingsPeriod,
  type ServiceRatingsAggregate,
} from '@/hooks/useRatingsConcentration';
import { getServiceTypeLabel } from '@/components/icons/serviceTypeIcons';

export function RatingsConcentrationPanel() {
  const [period, setPeriod] = useState<RatingsPeriod>('90d');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ServiceRatingsAggregate | null>(null);

  const { aggregates, availableServiceTypes, summary, isLoading, error, refresh } =
    useRatingsConcentration({
      period,
      serviceTypeFilter: serviceTypeFilter === 'all' ? null : serviceTypeFilter,
    });

  const TRY_THRESHOLDS = [5, 3, 2, 1];
  let topThreshold = 5;
  let topItems: ServiceRatingsAggregate[] = [];
  for (const t of TRY_THRESHOLDS) {
    const filtered = aggregates.filter((a) => a.count >= t);
    if (filtered.length > 0) {
      topThreshold = t;
      topItems = [...filtered].sort((a, b) => b.polarizationIndex - a.polarizationIndex).slice(0, 10);
      break;
    }
  }

  const summaryCells = useMemo(() => {
    if (summary.serviceCount === 0) return [];
    return [
      { label: 'Equipamentos', value: summary.serviceCount },
      { label: 'Avaliações', value: summary.totalRatings },
      { label: 'Média geral ★', value: summary.avgStars.toFixed(2), accentClass: 'text-amber-600' },
      {
        label: 'Polarização média',
        value: `${summary.avgPolarization.toFixed(0)}%`,
        accentClass: summary.avgPolarization >= 50 ? 'text-destructive' : undefined,
      },
    ];
  }, [summary]);

  const filters = (
    <HeatmapFiltersBar onRefresh={refresh} isLoading={isLoading}>
      <div className="space-y-1.5">
        <Label htmlFor="ratings-period" className="text-xs font-medium text-muted-foreground">
          Período
        </Label>
        <Select value={period} onValueChange={(v) => setPeriod(v as RatingsPeriod)}>
          <SelectTrigger id="ratings-period" className="h-9 bg-background">
            <SelectValue placeholder="Período" />
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
        <Label htmlFor="ratings-type" className="text-xs font-medium text-muted-foreground">
          Tipo de serviço
        </Label>
        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
          <SelectTrigger id="ratings-type" className="h-9 bg-background">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {availableServiceTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {getServiceTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </HeatmapFiltersBar>
  );

  const rankingAside =
    aggregates.length > 0 && topItems.length > 0 ? (
      <Card className="border-border/80 p-4 shadow-sm md:p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4" aria-hidden />
          Top {topItems.length} equipamentos mais polarizados
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Equipamentos com ≥ {topThreshold} avaliação{topThreshold === 1 ? '' : 'ões'} no recorte.
        </p>
        <ul className="divide-y divide-border">
          {topItems.map((a) => (
            <li
              key={a.serviceId}
              className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-2 hover:bg-muted/40"
              onClick={() => setSelected(a)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(a);
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.serviceName ?? 'Sem nome'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.serviceType ? getServiceTypeLabel(a.serviceType) : '—'} · {a.district ?? '—'}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs">
                <div className="font-bold tabular-nums">{a.polarizationIndex}%</div>
                <div className="text-muted-foreground">
                  {a.count} aval. · ★ {a.avgStars.toFixed(1)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    ) : null;

  return (
    <>
      <HeatmapPanelShell
        metricId="avaliacoes"
        subtitle="Bolhas por equipamento — cor pela nota, tamanho pelo volume"
        filters={
          <>
            <p className="text-xs text-muted-foreground">
              Dados de avaliações de equipamentos —{' '}
              <Link
                to="/admin/equipment-ratings"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                gestão operacional
              </Link>
              .
            </p>
            {filters}
            {summaryCells.length > 0 ? (
              <HeatmapMetricsStrip cells={summaryCells} isLoading={isLoading} />
            ) : null}
          </>
        }
        error={error}
        aside={rankingAside}
        footer={
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">Legenda:</span>
            <Badge style={{ backgroundColor: 'hsl(0,75%,45%)', color: 'white' }}>1★ – Ruim</Badge>
            <Badge style={{ backgroundColor: 'hsl(60,75%,45%)', color: 'black' }}>3★ – Médio</Badge>
            <Badge style={{ backgroundColor: 'hsl(120,75%,45%)', color: 'white' }}>5★ – Excelente</Badge>
          </div>
        }
      >
        {isLoading && aggregates.length === 0 ? (
          <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
        ) : (
          <RatingsBubbleMap aggregates={aggregates} onSelect={setSelected} />
        )}
      </HeatmapPanelShell>

      <ServiceRatingsDetailSheet selected={selected} onClose={() => setSelected(null)} />
    </>
  );
}
