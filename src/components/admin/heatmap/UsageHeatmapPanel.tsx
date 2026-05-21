import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
import { AdminReportsHeatmap } from '@/components/admin/AdminReportsHeatmap';
import { HeatmapFilterLabel } from '@/components/admin/heatmap/HeatmapFilterLabel';
import { HeatmapPanelIntro } from '@/components/admin/heatmap/HeatmapPanelIntro';
import { HeatmapVisualScale } from '@/components/admin/heatmap/HeatmapVisualScale';
import {
  useUsageHeatmap,
  type UsageHeatmapPeriod,
  type UsageHeatmapTypeFilter,
} from '@/hooks/useUsageHeatmap';
import {
  USAGE_HEATMAP_PERIOD_LEGEND,
  USAGE_HEATMAP_SOURCE_FILTER_LEGEND,
  usageHeatmapPanelLegends,
} from '@/lib/analyticsParameterLegends';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export function UsageHeatmapPanel() {
  const [typeFilter, setTypeFilter] = useState<UsageHeatmapTypeFilter>('all_usage');
  const [period, setPeriod] = useState<UsageHeatmapPeriod>('30d');

  const { data, isLoading, error, refresh } = useUsageHeatmap({ typeFilter, period });
  const breakdown = data?.breakdown;

  return (
    <div className="space-y-4">
      <HeatmapPanelIntro
        intro={
          <>
            Concentração de uso da plataforma no território de São Paulo. Passe o mouse nos parâmetros (
            <span className="font-medium text-foreground">?</span>) ou expanda a legenda abaixo para
            entender cada indicador.
          </>
        }
        legends={usageHeatmapPanelLegends()}
        tooltipTitle="Parâmetros — densidade de uso"
        ariaLabel="Ver todos os parâmetros do mapa de densidade de uso"
      />

      <Card className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <HeatmapFilterLabel
                htmlFor="heatmap-type"
                legend={USAGE_HEATMAP_SOURCE_FILTER_LEGEND}
              />
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as UsageHeatmapTypeFilter)}
              >
                <SelectTrigger id="heatmap-type">
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
            <div className="space-y-2">
              <HeatmapFilterLabel htmlFor="heatmap-period" legend={USAGE_HEATMAP_PERIOD_LEGEND} />
              <Select value={period} onValueChange={(v) => setPeriod(v as UsageHeatmapPeriod)}>
                <SelectTrigger id="heatmap-period">
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
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <HeatmapVisualScale variant="density" className="mb-3" />

        {isLoading && !data ? (
          <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
        ) : (
          <AdminReportsHeatmap points={data?.points ?? []} />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Referência rápida:</span>
          <Badge style={{ backgroundColor: 'hsl(221, 83%, 40%)', color: 'white' }}>Menor densidade</Badge>
          <Badge style={{ backgroundColor: 'hsl(78, 70%, 42%)', color: 'black' }}>Intermediária</Badge>
          <Badge style={{ backgroundColor: 'hsl(0, 72%, 48%)', color: 'white' }}>Maior densidade</Badge>
        </div>

        {data && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {data.points.length} células no mapa
              {data.truncated ? ' (resultado truncado para performance)' : ''}.
              {data.start_at
                ? ` Dados desde ${new Date(data.start_at).toLocaleString('pt-BR')}.`
                : ''}
            </p>
            {breakdown && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" title="Células com peso de relatos urbanos">
                  Urbano: {breakdown.urban}
                </Badge>
                <Badge variant="outline" title="Células com peso de avaliações">
                  Avaliações: {breakdown.evaluation}
                </Badge>
                <Badge variant="outline" title="Células com peso de visitas a equipamentos">
                  Visitas: {breakdown.visits}
                </Badge>
                <Badge variant="outline" title="Células com peso de transporte (por zona)">
                  Transporte: {breakdown.transport}
                </Badge>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
