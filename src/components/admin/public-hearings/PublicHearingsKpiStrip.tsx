import { Card } from '@/components/ui/card';
import type { AudienciasStats } from '@/hooks/useAudienciasAnalytics';

type PublicHearingsKpiStripProps = {
  stats: Pick<
    AudienciasStats,
    'audienciasAbertas' | 'totalInscricoes' | 'totalEscritas'
  >;
  loading?: boolean;
};

const cells = [
  { key: 'open' as const, label: 'Audiências abertas', pick: (s: AudienciasStats) => s.audienciasAbertas },
  {
    key: 'registrations' as const,
    label: 'Inscrições confirmadas',
    pick: (s: AudienciasStats) => s.totalInscricoes,
  },
  {
    key: 'statements' as const,
    label: 'Manifestações recebidas',
    pick: (s: AudienciasStats) => s.totalEscritas,
  },
];

export function PublicHearingsKpiStrip({ stats, loading }: PublicHearingsKpiStripProps) {
  return (
    <section aria-label="Indicadores de audiências">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {cells.map(({ key, label, pick }) => (
            <div key={key} className="flex flex-col gap-2 px-4 py-3.5">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading ? '—' : pick(stats).toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
