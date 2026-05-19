import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageShell } from '@/components/ui/PageShell';
import { KpiCard } from '@/components/ui/KpiCard';
import {
  PUBLIC_HEARINGS_KPI_LEGENDS,
  PUBLIC_HEARINGS_PAGE_LEGEND,
} from '@/lib/analyticsParameterLegends';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToAudiencias } from '@/lib/globalFiltersToAudiencias';
import { useAudienciasAnalytics } from '@/hooks/useAudienciasAnalytics';

export function PublicHearingsPage() {
  const { period, region } = useGlobalFilters();
  const filters = useMemo(() => globalFiltersToAudiencias(period, region), [period, region]);
  const { stats, isLoading, error, refresh } = useAudienciasAnalytics(filters);

  const openCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return stats.topAudiencias.filter((a) => a.data >= today).length;
  }, [stats.topAudiencias]);

  return (
    <PageShell title="Audiências públicas" titleInfo={PUBLIC_HEARINGS_PAGE_LEGEND}>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Audiências abertas"
          value={isLoading ? '—' : String(openCount)}
          parameter={PUBLIC_HEARINGS_KPI_LEGENDS.open}
        />
        <KpiCard
          label="Inscrições confirmadas"
          value={isLoading ? '—' : String(stats.totalInscricoes)}
          parameter={PUBLIC_HEARINGS_KPI_LEGENDS.registrations}
        />
        <KpiCard
          label="Manifestações recebidas"
          value={isLoading ? '—' : String(stats.totalEscritas)}
          parameter={PUBLIC_HEARINGS_KPI_LEGENDS.statements}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <p className="text-sm font-semibold">Audiências no recorte</p>
          <p className="text-xs text-muted-foreground">
            Engajamento combinado (lembretes + videoconferência + manifestações escritas).
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : stats.topAudiencias.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma audiência no período.</p>
        ) : (
          <ul className="divide-y divide-border">
            {stats.topAudiencias.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.comissao ?? 'Sem comissão'} · {format(new Date(a.data), 'dd/MM/yyyy', { locale: ptBR })} ·{' '}
                    {a.zona}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Badge variant="secondary">
                    {a.inscricoes} {a.inscricoes === 1 ? 'inscrição' : 'inscrições'}
                  </Badge>
                  {a.ocupacaoPct != null && (
                    <Badge variant="outline">{a.ocupacaoPct}% vagas</Badge>
                  )}
                  <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <Link to={`/audiencias/${a.id}`}>Ver detalhe</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
