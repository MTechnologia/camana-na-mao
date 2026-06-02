import { Card } from "@/components/ui/card";
import { BarChart3, AlertCircle, Clock, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";

interface ReportKPIsProps {
  total: number;
  critical: number;
  pending: number;
  resolved: number;
  totalTrend: number;
  criticalTrend: number;
  pendingTrend: number;
  resolvedTrend: number;
}

export const ReportKPIs = ({
  total,
  critical,
  pending,
  resolved,
  totalTrend,
  criticalTrend,
  pendingTrend,
  resolvedTrend,
}: ReportKPIsProps) => {
  const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;

    const isPositive = value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? "text-green-600" : "text-red-600";

    return (
      <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(value)}%
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total</span>
          </div>
          <TrendIndicator value={totalTrend} />
        </div>
        <p className="text-2xl font-bold">{total.toLocaleString("pt-BR")}</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Críticos</span>
          </div>
          <TrendIndicator value={criticalTrend} />
        </div>
        <p className="text-2xl font-bold text-red-600">{critical.toLocaleString("pt-BR")}</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Pendentes</span>
          </div>
          <TrendIndicator value={pendingTrend} />
        </div>
        <p className="text-2xl font-bold text-yellow-600">{pending.toLocaleString("pt-BR")}</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Resolvidos</span>
          </div>
          <TrendIndicator value={resolvedTrend} />
        </div>
        <p className="text-2xl font-bold text-green-600">{resolved.toLocaleString("pt-BR")}</p>
      </Card>
    </div>
  );
};
