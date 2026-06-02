import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Clock, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PatternAlert {
  id: string;
  type: "frequency" | "location" | "time" | "severity";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  suggestedAction: string;
  count?: number;
  confidence?: number;
}

interface PatternAlertsProps {
  alerts: PatternAlert[];
  onView?: (id: string) => void;
  onForward?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onAlertClick?: (alert: PatternAlert) => void;
}

const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case "critical":
      return {
        icon: AlertTriangle,
        color: "text-chart-5",
        bg: "bg-chart-5/10",
        border: "border-chart-5/20",
        badge: "CRÍTICO",
      };
    case "warning":
      return {
        icon: TrendingUp,
        color: "text-chart-3",
        bg: "bg-chart-3/10",
        border: "border-chart-3/20",
        badge: "ATENÇÃO",
      };
    default:
      return {
        icon: Clock,
        color: "text-chart-2",
        bg: "bg-chart-2/10",
        border: "border-chart-2/20",
        badge: "INFO",
      };
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "frequency":
      return TrendingUp;
    case "location":
      return MapPin;
    case "time":
      return Clock;
    default:
      return AlertTriangle;
  }
};

export const PatternAlerts = ({
  alerts,
  onView,
  onForward,
  onDismiss,
  onAlertClick,
}: PatternAlertsProps) => {
  return (
    <div className="space-y-4">
      {alerts.map((alert, index) => {
        const severityConfig = getSeverityConfig(alert.severity);
        const TypeIcon = getTypeIcon(alert.type);
        const SeverityIcon = severityConfig.icon;

        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-card border rounded-lg p-4 ${severityConfig.border} ${onAlertClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
            onClick={() => onAlertClick?.(alert)}
          >
            {/* Dismiss button */}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg ${severityConfig.bg}`}>
                <SeverityIcon className={`h-5 w-5 ${severityConfig.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`${severityConfig.color} border-current`}>
                    {severityConfig.badge}
                  </Badge>
                  {alert.confidence && (
                    <span className="text-xs text-muted-foreground">
                      Confiança: {alert.confidence}%
                    </span>
                  )}
                </div>

                <h4 className="font-semibold text-foreground mb-1">{alert.title}</h4>

                <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>

                {alert.suggestedAction && (
                  <div className="flex items-start gap-2 mb-3 p-2 bg-muted/50 rounded">
                    <TypeIcon className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Ação sugerida:</span> {alert.suggestedAction}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onView && (
                <Button size="sm" variant="outline" onClick={() => onView(alert.id)}>
                  Ver detalhes
                </Button>
              )}
              {onForward && (
                <Button size="sm" onClick={() => onForward(alert.id)}>
                  Encaminhar
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
