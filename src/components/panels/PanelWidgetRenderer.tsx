import type { PanelWidget } from "@/types/customPanel";
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
} from "@/components/panels/widgets/PanelWidgetCharts";

export function PanelWidgetRenderer({ widget }: { widget: PanelWidget }) {
  switch (widget.type) {
    case "kpi_quad":
      return <WidgetKpiQuad widget={widget} />;
    case "kpi_single":
      return <WidgetKpiSingle widget={widget} />;
    case "chart_bar_drill":
      return <WidgetBarDrill widget={widget} />;
    case "chart_line_volume":
      return <WidgetLineVolume widget={widget} />;
    case "chart_pie_status":
      return <WidgetPieStatus widget={widget} />;
    case "chart_pie_sentiment":
      return <WidgetPieSentiment widget={widget} />;
    case "list_patterns_top":
      return <WidgetPatternsTop widget={widget} />;
    case "list_patterns_region":
      return <WidgetPatternsRegion widget={widget} />;
    case "chart_scatter_correlation":
      return <WidgetScatterCorrelation widget={widget} />;
    case "chart_territory_intensity":
      return <WidgetTerritoryIntensity widget={widget} />;
    default:
      return <p className="text-sm text-muted-foreground">Tipo de widget não suportado.</p>;
  }
}
