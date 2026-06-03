import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getCatalogEntry } from "@/lib/widgetCatalog";
import {
  CATEGORY_FILTER_OPTIONS,
  PERIOD_FILTER_OPTIONS,
  REGION_FILTER_OPTIONS,
} from "@/lib/globalFilterOptions";
import type { AnalyticsMetric } from "@/types/analyticsDrill";
import type { PanelColSpan, PanelRowSpan, PanelWidget } from "@/types/customPanel";

const METRIC_OPTIONS: { value: AnalyticsMetric; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "response_time", label: "Tempo de resposta" },
  { value: "sentiment", label: "Sentimento" },
  { value: "patterns", label: "Padrões" },
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function WidgetConfigPanel({
  widget,
  onChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  widget: PanelWidget;
  onChange: (widget: PanelWidget) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const entry = getCatalogEntry(widget.type);
  const supportsMetric = Boolean(entry.supportedMetrics?.length || entry.defaultFilters?.metric);

  const patch = (partial: Partial<PanelWidget>) => onChange({ ...widget, ...partial });
  const patchFilters = (partial: PanelWidget["filters"]) =>
    patch({ filters: { ...widget.filters, ...partial } });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Configurar widget</p>
        <p className="text-xs text-muted-foreground">{entry.description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="widget-title">Título exibido</Label>
        <Input
          id="widget-title"
          value={widget.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="widget-cols">Largura (colunas)</Label>
          <select
            id="widget-cols"
            className={selectClass}
            value={widget.colSpan}
            onChange={(e) => patch({ colSpan: Number(e.target.value) as PanelColSpan })}
          >
            <option value={4}>1/3</option>
            <option value={6}>Metade</option>
            <option value={8}>2/3</option>
            <option value={12}>Largura total</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="widget-rows">Altura</Label>
          <select
            id="widget-rows"
            className={selectClass}
            value={widget.rowSpan}
            onChange={(e) => patch({ rowSpan: Number(e.target.value) as PanelRowSpan })}
          >
            <option value={1}>Compacta</option>
            <option value={2}>Alta</option>
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="rounded border-input"
          checked={widget.filters.useGlobalFilters !== false}
          onChange={(e) => patchFilters({ useGlobalFilters: e.target.checked })}
        />
        Usar filtros globais do painel
      </label>

      {widget.filters.useGlobalFilters === false ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">Filtros locais</p>
          <div className="space-y-2">
            <Label htmlFor="w-period">Período</Label>
            <select
              id="w-period"
              className={selectClass}
              value={widget.filters.period ?? PERIOD_FILTER_OPTIONS[0]?.value}
              onChange={(e) => patchFilters({ period: e.target.value })}
            >
              {PERIOD_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-region">Região</Label>
            <select
              id="w-region"
              className={selectClass}
              value={widget.filters.region ?? "all"}
              onChange={(e) => patchFilters({ region: e.target.value })}
            >
              {REGION_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-category">Categoria</Label>
            <select
              id="w-category"
              className={selectClass}
              value={widget.filters.category ?? "all"}
              onChange={(e) => patchFilters({ category: e.target.value })}
            >
              {CATEGORY_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {supportsMetric ? (
        <div className="space-y-2">
          <Label htmlFor="w-metric">Métrica (drill-across)</Label>
          <select
            id="w-metric"
            className={selectClass}
            value={widget.filters.metric ?? "volume"}
            onChange={(e) => patchFilters({ metric: e.target.value as AnalyticsMetric })}
          >
            {METRIC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {widget.type === "chart_bar_drill" ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="rounded border-input"
            checked={widget.filters.enableDrill !== false}
            onChange={(e) => patchFilters({ enableDrill: e.target.checked })}
          />
          Habilitar drill-down nas barras
        </label>
      ) : null}

      {(widget.type === "list_patterns_top" || widget.type === "list_patterns_region") && (
        <div className="space-y-2">
          <Label htmlFor="w-topn">Itens exibidos</Label>
          <Input
            id="w-topn"
            type="number"
            min={3}
            max={20}
            value={widget.filters.topN ?? 8}
            onChange={(e) => patchFilters({ topN: Number(e.target.value) })}
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium disabled:opacity-40"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          Subir
        </button>
        <button
          type="button"
          className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium disabled:opacity-40"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          Descer
        </button>
      </div>
    </div>
  );
}
