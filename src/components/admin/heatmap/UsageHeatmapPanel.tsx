import { useMemo, useState } from 'react';
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
import { AdminReportsHeatmap } from '@/components/admin/AdminReportsHeatmap';
import { HeatmapFiltersBar } from '@/components/admin/heatmap-page/HeatmapFiltersBar';
import { HeatmapMetricsStrip } from '@/components/admin/heatmap-page/HeatmapMetricsStrip';
import { HeatmapPanelShell } from '@/components/admin/heatmap-page/HeatmapPanelShell';
import {
  useUsageHeatmap,
  type UsageHeatmapPeriod,
  type UsageHeatmapTypeFilter,
} from '@/hooks/useUsageHeatmap';

export function UsageHeatmapPanel() {
  const [typeFilter, setTypeFilter] = useState<UsageHeatmapTypeFilter>('all_usage');
  const [period, setPeriod] = useState<UsageHeatmapPeriod>('30d');

  const { data, isLoading, error, refresh } = useUsageHeatmap({ typeFilter, period });
  const breakdown = data?.breakdown;

  const summaryCells = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Células no mapa', value: data.points.length },
      { label: 'Urbano', value: breakdown?.urban ?? 0 },
      { label: 'Avaliações', value: breakdown?.evaluation ?? 0 },
      { label: 'Transporte', value: breakdown?.transport ?? 0 },
    ];
  }, [data, breakdown]);

  const filters = (
    <HeatmapFiltersBar onRefresh={refresh} isLoading={isLoading}>
      <div className="space-y-1.5">
        <Label htmlFor="heatmap-type" className="text-xs font-medium text-muted-foreground">
          Fonte de dados
        </Label>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as UsageHeatmapTypeFilter)}
        >
          <SelectTrigger id="heatmap-type" className="h-9 bg-background">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_usage">Uso total (todas as fontes)</SelectItem>
            <SelectItem value="all_reports">Apenas relatos (urbano + avaliações)</SelectItem>
            <SelectItem value="urban">Relatos urbanos</SelectItem>
            <SelectItem value="evaluation">Avaliações de serviços</SelectItem>
            <SelectItem value="visits">Visitas a equipamentos públicos</SelectItem>
            <SelectItem value="transport">Relatos de transporte (por zona)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="heatmap-period" className="text-xs font-medium text-muted-foreground">
          Período
        </Label>
        <Select value={period} onValueChange={(v) => setPeriod(v as UsageHeatmapPeriod)}>
          <SelectTrigger id="heatmap-period" className="h-9 bg-background">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </HeatmapFiltersBar>
  );

  return (
    <HeatmapPanelShell
      metricId="uso"
      subtitle="Pontos geocodificados em São Paulo — densidade por célula"
      filters={
        <>
          {filters}
          {summaryCells.length > 0 ? (
            <HeatmapMetricsStrip cells={summaryCells} isLoading={isLoading && !data} />
          ) : null}
        </>
      }
      error={error}
      footer={
        data ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {data.points.length} células no mapa
              {data.truncated ? ' (resultado truncado para performance)' : ''}.
              {data.start_at
                ? ` Dados desde ${new Date(data.start_at).toLocaleString('pt-BR')}.`
                : ''}
            </p>
            {breakdown ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Visitas: {breakdown.visits}</Badge>
              </div>
            ) : null}
          </div>
        ) : null
      }
    >
      {isLoading && !data ? (
        <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
      ) : (
        <AdminReportsHeatmap points={data?.points ?? []} />
      )}
    </HeatmapPanelShell>
  );
}
