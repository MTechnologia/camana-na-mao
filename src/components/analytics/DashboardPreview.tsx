import { WidgetRenderer } from './WidgetRenderer';

export interface WidgetConfig {
  id: string;
  type: 'bar-chart' | 'pie-chart' | 'line-chart' | 'kpi-card' | 'table' | 'heatmap';
  title: string;
  dataSource: 'urban_reports' | 'transport_reports' | 'service_ratings' | 'audiencias';
  dimension?: string;
  metric?: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
}

interface DashboardPreviewProps {
  config: DashboardConfig;
}

export const DashboardPreview = ({ config }: DashboardPreviewProps) => {
  if (!config || !config.widgets || config.widgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg border-2 border-dashed border-border">
        <p className="text-muted-foreground text-sm">
          Nenhum widget adicionado ao painel
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {config.widgets.map((widget: WidgetConfig) => (
        <div
          key={widget.id}
          style={{ gridColumn: `span ${widget.position.w}` }}
          className="min-h-[200px]"
        >
          <WidgetRenderer widget={widget} />
        </div>
      ))}
    </div>
  );
};
