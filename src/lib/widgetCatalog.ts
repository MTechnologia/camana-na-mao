import type { PanelWidgetType } from '@/types/customPanel';
import type { AnalyticsMetric } from '@/types/analyticsDrill';
import {
  BarChart3,
  GitBranch,
  LayoutGrid,
  LineChart,
  ListOrdered,
  MapPin,
  PieChart,
  ScatterChart,
  type LucideIcon,
} from 'lucide-react';

export type WidgetCatalogCategory = 'indicadores' | 'graficos' | 'listas' | 'territorio';

export type WidgetCatalogEntry = {
  type: PanelWidgetType;
  label: string;
  description: string;
  category: WidgetCatalogCategory;
  Icon: LucideIcon;
  defaultTitle: string;
  defaultColSpan: 4 | 6 | 8 | 12;
  defaultRowSpan: 1 | 2;
  supportedMetrics?: AnalyticsMetric[];
  defaultFilters?: {
    enableDrill?: boolean;
    topN?: number;
    metric?: AnalyticsMetric;
  };
};

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    type: 'kpi_quad',
    label: '4 indicadores',
    description: 'Volume, resposta, sentimento e padrões no recorte atual.',
    category: 'indicadores',
    Icon: LayoutGrid,
    defaultTitle: 'Indicadores principais',
    defaultColSpan: 12,
    defaultRowSpan: 1,
  },
  {
    type: 'kpi_single',
    label: 'Indicador único',
    description: 'Um KPI com métrica escolhida e filtros próprios.',
    category: 'indicadores',
    Icon: BarChart3,
    defaultTitle: 'Indicador',
    defaultColSpan: 4,
    defaultRowSpan: 1,
    supportedMetrics: ['volume', 'response_time', 'sentiment', 'patterns'],
    defaultFilters: { metric: 'volume' },
  },
  {
    type: 'chart_bar_drill',
    label: 'Barras com drill-down',
    description: 'Território → distrito → categoria; drill-across por métrica.',
    category: 'graficos',
    Icon: BarChart3,
    defaultTitle: 'Volume por território',
    defaultColSpan: 8,
    defaultRowSpan: 2,
    supportedMetrics: ['volume', 'response_time', 'sentiment', 'patterns'],
    defaultFilters: { metric: 'volume', enableDrill: true },
  },
  {
    type: 'chart_line_volume',
    label: 'Linha — evolução',
    description: 'Série temporal de volume e resolvidos no período.',
    category: 'graficos',
    Icon: LineChart,
    defaultTitle: 'Evolução no período',
    defaultColSpan: 8,
    defaultRowSpan: 1,
  },
  {
    type: 'chart_pie_status',
    label: 'Pizza — status',
    description: 'Distribuição de status dos relatos no recorte.',
    category: 'graficos',
    Icon: PieChart,
    defaultTitle: 'Status dos relatos',
    defaultColSpan: 4,
    defaultRowSpan: 1,
  },
  {
    type: 'chart_pie_sentiment',
    label: 'Pizza — sentimento',
    description: 'Polaridade positiva, neutra e negativa.',
    category: 'graficos',
    Icon: PieChart,
    defaultTitle: 'Sentimento agregado',
    defaultColSpan: 4,
    defaultRowSpan: 1,
    defaultFilters: { metric: 'sentiment' },
  },
  {
    type: 'list_patterns_top',
    label: 'Ranking de padrões',
    description: 'Temas recorrentes mais frequentes.',
    category: 'listas',
    Icon: ListOrdered,
    defaultTitle: 'Padrões em destaque',
    defaultColSpan: 4,
    defaultRowSpan: 2,
    defaultFilters: { topN: 8 },
  },
  {
    type: 'list_patterns_region',
    label: 'Padrões por região',
    description: 'Tema predominante em cada zona territorial.',
    category: 'listas',
    Icon: GitBranch,
    defaultTitle: 'Padrões por zona',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultFilters: { topN: 5 },
  },
  {
    type: 'chart_scatter_correlation',
    label: 'Correlação',
    description: 'Volume × tempo de resposta × sentimento por categoria.',
    category: 'graficos',
    Icon: ScatterChart,
    defaultTitle: 'Correlação entre métricas',
    defaultColSpan: 8,
    defaultRowSpan: 2,
  },
  {
    type: 'chart_territory_intensity',
    label: 'Intensidade territorial',
    description: 'Mapa de barras por intensidade de ocorrências.',
    category: 'territorio',
    Icon: MapPin,
    defaultTitle: 'Intensidade por território',
    defaultColSpan: 12,
    defaultRowSpan: 2,
  },
];

export const WIDGET_CATEGORY_LABELS: Record<WidgetCatalogCategory, string> = {
  indicadores: 'Indicadores',
  graficos: 'Gráficos',
  listas: 'Listas e rankings',
  territorio: 'Território',
};

export function getCatalogEntry(type: PanelWidgetType): WidgetCatalogEntry {
  const entry = WIDGET_CATALOG.find((w) => w.type === type);
  if (!entry) throw new Error(`Widget type desconhecido: ${type}`);
  return entry;
}
