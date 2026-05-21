import { Card } from '@/components/ui/card';
import type { EquipmentRatingsKpis } from '@/hooks/useEquipmentRatingsAdmin';

type EquipmentRatingsKpiStripProps = {
  kpis: EquipmentRatingsKpis;
  loading?: boolean;
};

const cells = [
  { key: 'total' as const, label: 'Total no período', format: (k: EquipmentRatingsKpis) => k.total },
  {
    key: 'pending' as const,
    label: 'Pendentes de moderação',
    format: (k: EquipmentRatingsKpis) => k.pendingModeration,
  },
  {
    key: 'avgWait' as const,
    label: 'Tempo de espera (média)',
    format: (k: EquipmentRatingsKpis) =>
      k.avgWaitScore == null ? '—' : `${k.avgWaitScore}/5`,
  },
];

export function EquipmentRatingsKpiStrip({ kpis, loading }: EquipmentRatingsKpiStripProps) {
  return (
    <section aria-label="Indicadores de avaliações">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {cells.map(({ key, label, format }) => (
            <div key={key} className="flex flex-col gap-2 px-4 py-3.5">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading ? '—' : typeof format(kpis) === 'number' ? format(kpis).toLocaleString('pt-BR') : format(kpis)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
