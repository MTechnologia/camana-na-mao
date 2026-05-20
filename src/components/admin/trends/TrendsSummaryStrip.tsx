import { CalendarRange, GitBranch, LineChart, Sigma } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type TrendsSummary = {
  total: number;
  categories: number;
  peakLabel: string;
  peakValue: number;
  granularityLabel: string;
};

const cells = [
  { key: 'total' as const, label: 'Total no período', Icon: Sigma },
  { key: 'categories' as const, label: 'Categorias', Icon: GitBranch },
  { key: 'peak' as const, label: 'Maior pico', Icon: LineChart },
  { key: 'granularity' as const, label: 'Agregação', Icon: CalendarRange },
];

function formatCellValue(key: (typeof cells)[number]['key'], summary: TrendsSummary): string {
  switch (key) {
    case 'total':
      return summary.total.toLocaleString('pt-BR');
    case 'categories':
      return String(summary.categories);
    case 'peak':
      return summary.peakValue > 0
        ? `${summary.peakValue.toLocaleString('pt-BR')} · ${summary.peakLabel}`
        : '—';
    case 'granularity':
      return summary.granularityLabel;
    default:
      return '—';
  }
}

type TrendsSummaryStripProps = {
  summary: TrendsSummary;
  isLoading?: boolean;
};

export function TrendsSummaryStrip({ summary, isLoading }: TrendsSummaryStripProps) {
  return (
    <section aria-label="Resumo do período">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {cells.map(({ key, label, Icon }) => (
            <div
              key={key}
              className={cn(
                'relative flex flex-col gap-2 px-4 py-3.5',
                isLoading && 'animate-pulse',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p
                  className={cn(
                    'mt-0.5 font-semibold tabular-nums tracking-tight text-foreground',
                    key === 'peak' ? 'text-base leading-snug' : 'text-2xl',
                  )}
                >
                  {isLoading ? '…' : formatCellValue(key, summary)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
