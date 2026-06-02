import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimelineDataPoint {
  date: string;
  score: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface SentimentTrendProps {
  data: TimelineDataPoint[];
  comparisonData?: TimelineDataPoint[];
  onPointClick?: (date: string) => void;
}

type Period = "7d" | "30d" | "90d" | "1y";

export const SentimentTrend = ({ data, comparisonData, onPointClick }: SentimentTrendProps) => {
  const [period, setPeriod] = useState<Period>("30d");
  const [showComparison, setShowComparison] = useState(false);

  const periods: { value: Period; label: string }[] = [
    { value: "7d", label: "7 dias" },
    { value: "30d", label: "30 dias" },
    { value: "90d", label: "90 dias" },
    { value: "1y", label: "1 ano" },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {comparisonData && (
          <Button
            variant={showComparison ? "default" : "outline"}
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
          >
            Comparar período
          </Button>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          onClick={(e) => {
            if (e?.activePayload?.[0]?.payload?.date) {
              onPointClick?.(e.activePayload[0].payload.date);
            }
          }}
          className={onPointClick ? "cursor-pointer" : ""}
        >
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />

          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-medium text-foreground mb-2">{payload[0].payload.date}</p>
                    {payload.map((entry: { name?: string; value?: number; color?: string }) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="text-muted-foreground">{entry.name}:</span>
                        <span className="font-medium" style={{ color: entry.color }}>
                          {entry.value}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-4 text-sm mt-2 pt-2 border-t border-border">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium text-foreground">
                        {payload[0].payload.total}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend />

          <Area
            type="monotone"
            dataKey="score"
            name="Score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#colorScore)"
          />

          <Area
            type="monotone"
            dataKey="positive"
            name="Positivo"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#colorPositive)"
          />

          <Area
            type="monotone"
            dataKey="negative"
            name="Negativo"
            stroke="hsl(var(--chart-5))"
            strokeWidth={2}
            fill="url(#colorNegative)"
          />

          {showComparison && comparisonData && (
            <Line
              type="monotone"
              data={comparisonData}
              dataKey="score"
              name="Período anterior"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
