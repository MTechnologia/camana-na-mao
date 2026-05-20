import { getCatalogEntry } from '@/lib/widgetCatalog';
import { createPanelId, createWidgetId } from '@/lib/customPanelStorage';
import type { CustomPanel, PanelTemplateId, PanelWidget } from '@/types/customPanel';

function widgetFromCatalog(
  type: PanelWidget['type'],
  order: number,
  overrides?: Partial<Pick<PanelWidget, 'title' | 'colSpan' | 'rowSpan' | 'filters'>>,
): PanelWidget {
  const entry = getCatalogEntry(type);
  return {
    id: createWidgetId(),
    type,
    title: overrides?.title ?? entry.defaultTitle,
    colSpan: overrides?.colSpan ?? entry.defaultColSpan,
    rowSpan: overrides?.rowSpan ?? entry.defaultRowSpan,
    order,
    filters: {
      useGlobalFilters: true,
      ...entry.defaultFilters,
      ...overrides?.filters,
    },
  };
}

export function buildPanelFromTemplate(
  templateId: PanelTemplateId,
  name: string,
  description?: string,
): CustomPanel {
  const now = new Date().toISOString();
  let widgets: PanelWidget[] = [];

  switch (templateId) {
    case 'executive':
      widgets = [
        widgetFromCatalog('kpi_quad', 0),
        widgetFromCatalog('chart_bar_drill', 1, { colSpan: 8 }),
        widgetFromCatalog('chart_line_volume', 2, { colSpan: 4 }),
      ];
      break;
    case 'sentiment_ops':
      widgets = [
        widgetFromCatalog('chart_pie_sentiment', 0),
        widgetFromCatalog('list_patterns_top', 1),
        widgetFromCatalog('chart_pie_status', 2, { colSpan: 4 }),
        widgetFromCatalog('list_patterns_region', 3),
      ];
      break;
    case 'territory':
      widgets = [
        widgetFromCatalog('chart_territory_intensity', 0),
        widgetFromCatalog('chart_bar_drill', 1, {
          filters: { metric: 'volume', enableDrill: true },
        }),
        widgetFromCatalog('chart_scatter_correlation', 2, { colSpan: 6 }),
      ];
      break;
    case 'blank':
    default:
      widgets = [];
  }

  return {
    id: createPanelId(),
    name,
    description,
    widgets,
    createdAt: now,
    updatedAt: now,
  };
}

export const PANEL_TEMPLATE_OPTIONS: {
  id: PanelTemplateId;
  label: string;
  description: string;
}[] = [
  { id: 'blank', label: 'Em branco', description: 'Comece do zero e adicione widgets.' },
  {
    id: 'executive',
    label: 'Visão executiva',
    description: 'KPIs, barras com drill e evolução temporal.',
  },
  {
    id: 'sentiment_ops',
    label: 'Sentimento e padrões',
    description: 'Polaridade, rankings e status operacional.',
  },
  {
    id: 'territory',
    label: 'Território',
    description: 'Intensidade geográfica, drill e correlação.',
  },
];
