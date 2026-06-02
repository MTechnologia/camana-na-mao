import { Card } from "@/components/ui/card";
import { MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RegionalHotspotsProps {
  data: { region: string; category: string; count: number; trend?: "up" | "down" | "stable" }[];
  onRegionClick?: (region: string) => void;
}

export const RegionalHotspots = ({ data = [], onRegionClick }: RegionalHotspotsProps) => {
  const maxCount = Math.max(...(data.map((d) => d.count) || [1]), 1);

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-destructive" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (index: number) => {
    if (index < 3) return "bg-destructive";
    if (index < 6) return "bg-amber-500";
    return "bg-primary";
  };

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Mapa de Relatos por Região</h3>
        </div>
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          Nenhum dado regional disponível
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Mapa de Relatos por Região</h3>
        <Badge variant="secondary" className="ml-auto">
          {data.length} regiões
        </Badge>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
        {data.slice(0, 15).map((item, index) => (
          <div
            key={`${item.region}-${item.category}-${index}`}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
            onClick={() => onRegionClick?.(item.region)}
          >
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${getSeverityColor(index)}`}
            >
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate" title={item.region}>
                {item.region || "Não informado"}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={item.category}>
                {item.category}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getTrendIcon(item.trend)}

              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getSeverityColor(index)}`}
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>

              <span className="text-sm font-semibold w-8 text-right tabular-nums">
                {item.count}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Total: {data.reduce((acc, item) => acc + item.count, 0)} relatos</span>
        <span>Clique para detalhar</span>
      </div>
    </Card>
  );
};
