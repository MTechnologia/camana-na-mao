import { useMemo, useState } from 'react';
import { useGlobalShortcutPeriod } from '@/hooks/useGlobalShortcutPeriod';
import { PageShell } from '@/components/ui/PageShell';
import { RN_ANL_003_TRENDS_LEGEND } from '@/lib/analyticsParameterLegends';
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
import { TrendCategoryLineChart } from '@/components/admin/TrendCategoryLineChart';
import {
  useReportsTrend,
  type ReportsTrendTypeFilter,
} from '@/hooks/useReportsTrend';
import { useTransportLines } from '@/hooks/useTransportLines';
import { buildTrendChartRows } from '@/lib/buildTrendChartRows';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { ExecutiveKpiSection } from '@/components/admin/analytics/ExecutiveKpiSection';
import { AnalyticsDrillBreadcrumb } from '@/components/admin/analytics/AnalyticsDrillBreadcrumb';

export function TrendDashboardPage() {
  const [typeFilter, setTypeFilter] = useState<ReportsTrendTypeFilter>('all');
  const [lineId, setLineId] = useState<string | null>(null);
  const period = useGlobalShortcutPeriod();

  const { lines, loading: linesLoading } = useTransportLines();
  const { data, isLoading, error, refresh } = useReportsTrend({
    typeFilter,
    lineId,
    period,
  });

  const { rows, categoryKeys } = useMemo(() => {
    if (!data?.points.length) return { rows: [], categoryKeys: [] as string[] };
    return buildTrendChartRows(data.points, data.granularity);
  }, [data]);

  const lineFilterVisible = typeFilter === 'all' || typeFilter === 'transport';

  return (
    <PageShell title="Tendências temporais" titleInfo={RN_ANL_003_TRENDS_LEGEND}>
      <div className="space-y-6">
        <AnalyticsDrillBreadcrumb />
        <ExecutiveKpiSection />

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Card className="p-4 md:p-6">
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trend-type">Tipo</Label>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v as ReportsTrendTypeFilter);
                  if (v !== 'all' && v !== 'transport') setLineId(null);
                }}
              >
                <SelectTrigger id="trend-type">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="urban">Relatos urbanos</SelectItem>
                  <SelectItem value="transport">Relatos de transporte</SelectItem>
                  <SelectItem value="evaluation">Avaliações de serviços</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trend-line">Linha (transporte)</Label>
              <Select
                value={lineId ?? '__all__'}
                onValueChange={(v) => setLineId(v === '__all__' ? null : v)}
                disabled={!lineFilterVisible || linesLoading}
              >
                <SelectTrigger id="trend-line">
                  <SelectValue placeholder={linesLoading ? 'Carregando…' : 'Todas as linhas'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as linhas</SelectItem>
                  {lines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.line_code} — {l.line_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!lineFilterVisible && (
                <p className="text-xs text-muted-foreground">Aplica-se a relatos de transporte.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isLoading && !data ? (
            <Skeleton className="h-[360px] w-full rounded-lg" />
          ) : (
            <TrendCategoryLineChart data={rows} categoryKeys={categoryKeys} />
          )}

          {data && (
            <p className="mt-4 text-xs text-muted-foreground">
              Agregação: {data.granularity === 'day' ? 'por dia' : data.granularity === 'week' ? 'por semana' : 'por mês'}.
              {data.start_at ? ` A partir de ${new Date(data.start_at).toLocaleString('pt-BR')}.` : ''}
            </p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
