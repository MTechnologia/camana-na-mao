import type { AnalyticsMetric } from "@/types/analyticsDrill";

/** Tipos de widget disponíveis no construtor (catálogo). */
export type PanelWidgetType =
  | "kpi_quad"
  | "kpi_single"
  | "chart_bar_drill"
  | "chart_line_volume"
  | "chart_pie_status"
  | "chart_pie_sentiment"
  | "list_patterns_top"
  | "list_patterns_region"
  | "chart_scatter_correlation"
  | "chart_territory_intensity";

export type PanelColSpan = 4 | 6 | 8 | 12;
export type PanelRowSpan = 1 | 2;

/** Filtros locais do widget — mesclados com filtros globais quando `useGlobalFilters` é true. */
export type WidgetFilters = {
  useGlobalFilters?: boolean;
  metric?: AnalyticsMetric;
  /** `inherit` usa o filtro global; caso contrário força o recorte. */
  region?: string;
  category?: string;
  period?: string;
  enableDrill?: boolean;
  topN?: number;
};

export type PanelWidget = {
  id: string;
  type: PanelWidgetType;
  title: string;
  colSpan: PanelColSpan;
  rowSpan: PanelRowSpan;
  order: number;
  filters: WidgetFilters;
};

export type CustomPanel = {
  id: string;
  name: string;
  description?: string;
  widgets: PanelWidget[];
  createdAt: string;
  updatedAt: string;
};

export type PanelTemplateId = "blank" | "executive" | "sentiment_ops" | "territory";
