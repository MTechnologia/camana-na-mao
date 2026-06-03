import { Plus } from "lucide-react";
import {
  WIDGET_CATALOG,
  WIDGET_CATEGORY_LABELS,
  type WidgetCatalogCategory,
} from "@/lib/widgetCatalog";
import type { PanelWidgetType } from "@/types/customPanel";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: WidgetCatalogCategory[] = ["indicadores", "graficos", "listas", "territorio"];

export function PanelWidgetPalette({ onAdd }: { onAdd: (type: PanelWidgetType) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">Biblioteca de widgets</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cada widget respeita os filtros globais ou filtros próprios que você definir.
        </p>
      </div>
      {CATEGORY_ORDER.map((category) => {
        const items = WIDGET_CATALOG.filter((w) => w.category === category);
        return (
          <div key={category}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {WIDGET_CATEGORY_LABELS[category]}
            </p>
            <ul className="space-y-2">
              {items.map((entry) => (
                <li key={entry.type}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left",
                      "transition-colors hover:border-primary/30 hover:bg-muted/40",
                    )}
                    onClick={() => onAdd(entry.type)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <entry.Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {entry.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                        {entry.description}
                      </span>
                    </span>
                    <Plus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
