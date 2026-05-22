import { Card } from '@/components/ui/card';

type ReferralsKpiStripProps = {
  kpis: { total: number; pending: number; sent: number; resolved: number };
};

const cells = [
  { key: 'total' as const, label: 'Total' },
  { key: 'pending' as const, label: 'Pendentes' },
  { key: 'sent' as const, label: 'Enviados' },
  { key: 'resolved' as const, label: 'Resolvidos' },
];

export function ReferralsKpiStrip({ kpis }: ReferralsKpiStripProps) {
  return (
    <section aria-label="Indicadores de encaminhamentos">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
          {cells.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-2 px-4 py-3.5">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {kpis[key].toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
