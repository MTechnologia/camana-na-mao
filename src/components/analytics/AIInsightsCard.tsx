import { AlertCircle, Lightbulb, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface AIInsight {
  id: string;
  type: "alert" | "opportunity" | "trend" | "pattern";
  title: string;
  description: string;
  details?: string[];
  suggestedAction?: string;
  confidence: number; // 0-100
  priority: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
}

interface AIInsightsCardProps {
  insight: AIInsight;
  onViewDetails?: (id: string) => void;
  onTakeAction?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export const AIInsightsCard = ({
  insight,
  onViewDetails,
  onTakeAction,
  onDismiss,
}: AIInsightsCardProps) => {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case "alert":
        return {
          icon: AlertCircle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          label: "ALERTA",
        };
      case "opportunity":
        return {
          icon: Lightbulb,
          color: "text-chart-1",
          bgColor: "bg-chart-1/10",
          borderColor: "border-chart-1/20",
          label: "OPORTUNIDADE",
        };
      case "trend":
        return {
          icon: TrendingUp,
          color: "text-chart-3",
          bgColor: "bg-chart-3/10",
          borderColor: "border-chart-3/20",
          label: "TENDÊNCIA",
        };
      default:
        return {
          icon: Sparkles,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
          label: "INSIGHT",
        };
    }
  };

  const config = getTypeConfig(insight.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("border-2", config.borderColor)}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("w-5 h-5", config.color)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold text-sm", config.color)}>{config.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {insight.confidence}% confiança
                  </Badge>
                </div>
                <h4 className="font-semibold text-foreground">{insight.title}</h4>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>

          {/* Details */}
          {insight.details && insight.details.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-foreground mb-1">Principais pontos:</p>
              <ul className="space-y-1">
                {insight.details.map((detail, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Action */}
          {insight.suggestedAction && (
            <div className={cn("p-2 rounded-md mb-3", config.bgColor)}>
              <p className="text-xs font-medium text-foreground mb-1">💡 Ação sugerida:</p>
              <p className="text-xs text-muted-foreground">{insight.suggestedAction}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(insight.id)}
                className="flex-1"
              >
                Ver detalhes
              </Button>
            )}
            {onTakeAction && (
              <Button size="sm" onClick={() => onTakeAction(insight.id)} className="flex-1">
                Tomar ação
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={() => onDismiss(insight.id)}>
                Ignorar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
