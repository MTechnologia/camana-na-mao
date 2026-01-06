import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Hotspot {
  region: string;
  category: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

interface HotspotsListProps {
  hotspots: Hotspot[];
  onHotspotClick?: (region: string, category: string) => void;
}

export const HotspotsList = ({ hotspots, onHotspotClick }: HotspotsListProps) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-destructive" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const maxCount = Math.max(...hotspots.map(h => h.count), 1);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Pontos Críticos</h3>
      </div>
      
      <div className="space-y-3">
        {hotspots.slice(0, 8).map((hotspot, index) => (
          <div
            key={`${hotspot.region}-${hotspot.category}`}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
              "hover:bg-muted/50 border border-transparent hover:border-border"
            )}
            onClick={() => onHotspotClick?.(hotspot.region, hotspot.category)}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{hotspot.region}</span>
                {getTrendIcon(hotspot.trend)}
              </div>
              <Badge variant="outline" className="mt-1 text-xs">
                {hotspot.category}
              </Badge>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">{hotspot.count}</div>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(hotspot.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        
        {hotspots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum ponto crítico identificado
          </div>
        )}
      </div>
    </Card>
  );
};
