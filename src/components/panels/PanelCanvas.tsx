import { GripVertical, Settings2, Trash2 } from 'lucide-react';
import { PanelWidgetRenderer } from '@/components/panels/PanelWidgetRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCatalogEntry } from '@/lib/widgetCatalog';
import type { CustomPanel, PanelWidget } from '@/types/customPanel';
import { cn } from '@/lib/utils';

const COL_SPAN_CLASS: Record<PanelWidget['colSpan'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12',
};

const ROW_SPAN_CLASS: Record<PanelWidget['rowSpan'], string> = {
  1: 'min-h-[200px]',
  2: 'min-h-[340px]',
};

function sortedWidgets(widgets: PanelWidget[]) {
  return [...widgets].sort((a, b) => a.order - b.order);
}

export function PanelCanvas({
  panel,
  mode = 'view',
  selectedWidgetId,
  onSelectWidget,
  onRemoveWidget,
}: {
  panel: CustomPanel;
  mode?: 'view' | 'edit';
  selectedWidgetId?: string | null;
  onSelectWidget?: (id: string) => void;
  onRemoveWidget?: (id: string) => void;
}) {
  const widgets = sortedWidgets(panel.widgets);

  if (widgets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">Nenhum widget neste painel</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === 'edit'
            ? 'Adicione widgets pela paleta à esquerda para montar sua visão.'
            : 'Edite o painel para adicionar indicadores e gráficos.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {widgets.map((widget) => {
        const selected = selectedWidgetId === widget.id;
        const entry = getCatalogEntry(widget.type);
        return (
          <Card
            key={widget.id}
            className={cn(
              COL_SPAN_CLASS[widget.colSpan],
              ROW_SPAN_CLASS[widget.rowSpan],
              'flex flex-col overflow-hidden transition-shadow',
              mode === 'edit' && selected && 'ring-2 ring-primary ring-offset-2',
              mode === 'edit' && 'cursor-pointer hover:shadow-md',
            )}
            onClick={mode === 'edit' ? () => onSelectWidget?.(widget.id) : undefined}
          >
            <CardContent className="flex h-full flex-col p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {mode === 'edit' ? (
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                    {widget.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{entry.label}</p>
                </div>
                {mode === 'edit' ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Configurar widget"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWidget?.(widget.id);
                      }}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Remover widget"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveWidget?.(widget.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="min-h-0 flex-1">
                <PanelWidgetRenderer widget={widget} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


