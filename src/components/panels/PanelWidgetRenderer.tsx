import type { PanelWidget } from '@/types/customPanel';
import {
  WidgetBarDrill,
  WidgetKpiQuad,
  WidgetKpiSingle,
  WidgetLineVolume,
  WidgetPatternsRegion,
  WidgetPatternsTop,
  WidgetPieSentiment,
  WidgetPieStatus,
  WidgetScatterCorrelation,
  WidgetTerritoryIntensity,
} from '@/components/panels/widgets/PanelWidgetCharts';

export function PanelWidgetRenderer({
  widget,
  embedded = false,
}: {
  widget: PanelWidget;
  /** Visualização dentro do painel salvo — sem cards aninhados. */
  embedded?: boolean;
}) {
  switch (widget.type) {
    case 'kpi_quad':
      return <WidgetKpiQuad widget={widget} embedded={embedded} />;
    case 'kpi_single':
      return <WidgetKpiSingle widget={widget} embedded={embedded} />;
    case 'chart_bar_drill':
      return <WidgetBarDrill widget={widget} />;
    case 'chart_line_volume':
      return <WidgetLineVolume widget={widget} />;
    case 'chart_pie_status':
      return <WidgetPieStatus widget={widget} />;
    case 'chart_pie_sentiment':
      return <WidgetPieSentiment widget={widget} />;
    case 'list_patterns_top':
      return <WidgetPatternsTop widget={widget} embedded={embedded} />;
    case 'list_patterns_region':
      return <WidgetPatternsRegion widget={widget} embedded={embedded} />;
    case 'chart_scatter_correlation':
      return <WidgetScatterCorrelation widget={widget} />;
    case 'chart_territory_intensity':
      return <WidgetTerritoryIntensity widget={widget} />;
    default:
      return (
        <p className="text-sm text-muted-foreground">Tipo de widget não suportado.</p>
      );
  }
}

