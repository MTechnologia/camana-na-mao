import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
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
import { useUserRole } from '@/hooks/useUserRole';
import { formatAudienciaTitulo } from '@/lib/audienciaDisplay';
import {
  PublicHearingsKpiSheet,
  type PublicHearingsKpiMode,
} from '@/components/admin/public-hearings/PublicHearingsKpiSheet';
import { AudienciaEngagementDetailSheet } from '@/components/admin/public-hearings/AudienciaEngagementDetailSheet';
import type { AudienciaRanking } from '@/hooks/useAudienciasAnalytics';

export function PublicHearingsPage() {
  const { period, region } = useGlobalFilters();
  const filters = useMemo(() => globalFiltersToAudiencias(period, region), [period, region]);
  const { stats, isLoading, isRefreshing, error, refresh, lastUpdate } =
    useAudienciasAnalytics(filters);
  const { isAdmin, isGestor } = useUserRole();
  const canViewEngagement = isAdmin || isGestor;

  const [kpiMode, setKpiMode] = useState<PublicHearingsKpiMode>(null);
  const [detailAudiencia, setDetailAudiencia] = useState<AudienciaRanking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const busy = isLoading || isRefreshing;
  const listItems = stats.allAudiencias.length > 0 ? stats.allAudiencias : stats.topAudiencias;

  const openDetail = (audiencia: AudienciaRanking) => {
    setDetailAudiencia(audiencia);
    setDetailOpen(true);
  };

  return (
    <PageShell title="Audiências públicas" titleInfo={PUBLIC_HEARINGS_PAGE_LEGEND}>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Audiências abertas"
          value={isLoading ? '—' : String(stats.audienciasAbertas)}
          parameter={PUBLIC_HEARINGS_KPI_LEGENDS.open}
          hint="Clique para ver a lista de audiências abertas"
          onOpenDetail={() => setKpiMode('open')}
        />
        <KpiCard
          label="Inscrições confirmadas"
          value={isLoading ? '—' : String(stats.totalInscricoes)}
          parameter={PUBLIC_HEARINGS_KPI_LEGENDS.registrations}
          hint="Clique para ver inscrições por audiência"
          onOpenDetail={() => setKpiMode('registrations')}
        />
        <KpiCard
          label="Manifestações recebidas"
          value={isLoading ? '—' : String(stats.totalEscritas)}
          parameter={PUBLIC_HEARINGS_KPI_LEGENDS.statements}
          hint="Clique para ver manifestações por audiência"
          onOpenDetail={() => setKpiMode('manifestations')}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Atualizado às{' '}
            {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw className={cn('mr-2 h-4 w-4', busy && 'animate-spin')} />
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
        ) : listItems.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma audiência no período.</p>
        ) : (
          <ul className="divide-y divide-border">
            {listItems.map((a) => {
              const titulo = formatAudienciaTitulo({
                titulo: a.titulo,
                ap_code: a.ap_code,
                tema: a.tema,
                comissao: a.comissao,
              });
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.comissao ?? 'Sem comissão'} ·{' '}
                      {format(new Date(a.data), 'dd/MM/yyyy', { locale: ptBR })} · {a.zona}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge variant="secondary">
                      {a.inscricoes} {a.inscricoes === 1 ? 'inscrição' : 'inscrições'}
                    </Badge>
                    {a.aberta && <Badge variant="default">Aberta</Badge>}
                    {a.ocupacaoPct != null && (
                      <Badge variant="outline">{a.ocupacaoPct}% vagas</Badge>
                    )}
                    {canViewEngagement ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => openDetail(a)}
                      >
                        Ver inscritos e manifestações
                      </Button>
                    ) : (
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <Link to={`/audiencias/${a.id}`}>Ver detalhe</Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PublicHearingsKpiSheet
        mode={kpiMode}
        items={stats.allAudiencias}
        open={kpiMode !== null}
        onOpenChange={(open) => !open && setKpiMode(null)}
      />

      <AudienciaEngagementDetailSheet
        audiencia={detailAudiencia}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canViewEngagement={canViewEngagement}
      />
    </PageShell>
  );
}
