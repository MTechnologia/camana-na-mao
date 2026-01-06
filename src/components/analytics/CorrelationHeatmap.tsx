import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CorrelationHeatmapProps {
  data: { x: string; y: string; value: number }[];
  xLabels: string[];
  yLabels: string[];
  title: string;
  onCellClick?: (x: string, y: string) => void;
}

export const CorrelationHeatmap = ({ 
  data, 
  xLabels, 
  yLabels, 
  title,
  onCellClick 
}: CorrelationHeatmapProps) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  const getValue = (x: string, y: string) => {
    const cell = data.find(d => d.x === x && d.y === y);
    return cell?.value || 0;
  };

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity === 0) return 'bg-muted/30';
    if (intensity < 0.25) return 'bg-primary/20';
    if (intensity < 0.5) return 'bg-primary/40';
    if (intensity < 0.75) return 'bg-primary/60';
    return 'bg-primary/80';
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* X-axis labels */}
          <div className="flex">
            <div className="w-24 shrink-0" />
            {xLabels.slice(0, 8).map(label => (
              <div 
                key={label} 
                className="w-16 text-xs text-muted-foreground text-center truncate px-1"
                title={label}
              >
                {label.length > 10 ? `${label.slice(0, 8)}...` : label}
              </div>
            ))}
          </div>
          
          {/* Heatmap rows */}
          {yLabels.slice(0, 10).map(yLabel => (
            <div key={yLabel} className="flex items-center">
              <div 
                className="w-24 shrink-0 text-xs text-muted-foreground truncate pr-2"
                title={yLabel}
              >
                {yLabel.length > 12 ? `${yLabel.slice(0, 10)}...` : yLabel}
              </div>
              {xLabels.slice(0, 8).map(xLabel => {
                const value = getValue(xLabel, yLabel);
                return (
                  <div
                    key={`${xLabel}-${yLabel}`}
                    className={cn(
                      'w-16 h-10 flex items-center justify-center text-xs font-medium transition-all cursor-pointer hover:scale-105 m-0.5 rounded',
                      getColor(value),
                      value > 0 && 'text-foreground'
                    )}
                    onClick={() => onCellClick?.(xLabel, yLabel)}
                    title={`${yLabel} + ${xLabel}: ${value}`}
                  >
                    {value > 0 ? value : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Menos</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-muted/30" />
          <div className="w-4 h-4 rounded bg-primary/20" />
          <div className="w-4 h-4 rounded bg-primary/40" />
          <div className="w-4 h-4 rounded bg-primary/60" />
          <div className="w-4 h-4 rounded bg-primary/80" />
        </div>
        <span>Mais</span>
      </div>
    </Card>
  );
};
