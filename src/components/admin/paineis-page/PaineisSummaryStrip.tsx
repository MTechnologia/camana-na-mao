import { useCustomPanels } from '@/contexts/CustomPanelsContext';
import { Card } from '@/components/ui/card';
import { LayoutGrid, Layers3, Boxes, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PaineisSummaryStrip() {
  const { panels, activePanel } = useCustomPanels();

  const totalWidgets = panels.reduce((sum, p) => sum + p.widgets.length, 0);
  const activeWidgets = activePanel?.widgets.length ?? 0;

  const cells = [
    { label: 'Painéis salvos', value: panels.length, Icon: LayoutGrid },
    { label: 'Widgets no ativo', value: activeWidgets, Icon: Layers3 },
    { label: 'Widgets no total', value: totalWidgets, Icon: Boxes },
    {
      label: 'Painel ativo',
      value: activePanel?.name ?? '—',
      Icon: CheckCircle2,
      compact: true,
    },
  ];

  return (
    <section aria-label="Resumo dos painéis">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <cell.Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{cell.label}</p>
                <p
                  className={cn(
                    'mt-0.5 font-semibold tracking-tight text-foreground',
                    cell.compact ? 'truncate text-base' : 'text-2xl tabular-nums',
                  )}
                  title={cell.compact ? String(cell.value) : undefined}
                >
                  {cell.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
