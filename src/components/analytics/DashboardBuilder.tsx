import { useState } from 'react';
import { Trash2, MoveUp, MoveDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPreview, type WidgetConfig, type DashboardConfig } from './DashboardPreview';
import { Badge } from '@/components/ui/badge';

interface DashboardBuilderProps {
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
}

export const DashboardBuilder = ({ config, onChange }: DashboardBuilderProps) => {
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newWidgets = [...config.widgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newWidgets.length) return;
    
    [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];
    onChange({ widgets: newWidgets });
  };

  const removeWidget = (index: number) => {
    const newWidgets = config.widgets.filter((_, i) => i !== index);
    onChange({ widgets: newWidgets });
  };

  return (
    <div className="space-y-6">
      {/* Widget List */}
      {config.widgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Widgets do Painel ({config.widgets.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.widgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{widget.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {widget.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fonte: {widget.dataSource}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveWidget(index, 'up')}
                    disabled={index === 0}
                  >
                    <MoveUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveWidget(index, 'down')}
                    disabled={index === config.widgets.length - 1}
                  >
                    <MoveDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWidget(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview do Painel</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardPreview config={config} />
        </CardContent>
      </Card>
    </div>
  );
};
