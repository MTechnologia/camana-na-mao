import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Circle, ClipboardList, ListChecks } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Counts = {
  pending: number;
  approved: number;
  rejected: number;
  applied: number;
  all: number;
};

type ServiceCorrectionsKpiStripProps = {
  counts: Counts;
  historyFilter: string;
  onSelect: (filter: string, tab: 'queue' | 'history') => void;
};

const cells: {
  key: string;
  label: string;
  countKey: keyof Counts;
  Icon: LucideIcon;
  tab: 'queue' | 'history';
}[] = [
  { key: 'pending', label: 'Pendentes', countKey: 'pending', Icon: ListChecks, tab: 'queue' },
  { key: 'approved', label: 'Aceitas', countKey: 'approved', Icon: CheckCircle2, tab: 'history' },
  { key: 'rejected', label: 'Recusadas', countKey: 'rejected', Icon: Circle, tab: 'history' },
  { key: 'applied', label: 'Aplicadas', countKey: 'applied', Icon: CheckCircle2, tab: 'history' },
  { key: 'all', label: 'Total', countKey: 'all', Icon: ClipboardList, tab: 'history' },
];

export function ServiceCorrectionsKpiStrip({
  counts,
  historyFilter,
  onSelect,
}: ServiceCorrectionsKpiStripProps) {
  return (
    <section aria-label="Indicadores de correções">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-5 lg:divide-y-0">
          {cells.map(({ key, label, countKey, Icon, tab }) => {
            const selected = tab === 'queue' ? false : historyFilter === key;
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  'relative flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors',
                  'hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  selected && 'bg-primary/[0.06]',
                  key === 'all' && 'col-span-2 lg:col-span-1',
                )}
                onClick={() => onSelect(key, tab)}
                aria-pressed={selected}
              >
                {selected ? (
                  <span
                    className="absolute inset-y-0 left-0 w-0.5 bg-primary lg:inset-x-0 lg:bottom-auto lg:top-0 lg:h-0.5 lg:w-auto"
                    aria-hidden
                  />
                ) : null}
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                </div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {counts[countKey].toLocaleString('pt-BR')}
                </p>
              </button>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
