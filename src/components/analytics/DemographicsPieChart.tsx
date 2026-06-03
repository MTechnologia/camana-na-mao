import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";

export interface DemographicData {
  /** Chave canônica no banco (ex.: masculino, branca, not_informed). */
  key: string;
  label: string;
  count: number;
  percentage: number;
}

interface DemographicsPieChartProps {
  data: DemographicData[];
  title: string;
  colors?: string[];
  onSegmentClick?: (key: string, label: string) => void;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-5))",
];

export const DemographicsPieChart = ({
  data,
  title,
  colors = DEFAULT_COLORS,
  onSegmentClick,
}: DemographicsPieChartProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full h-full flex flex-col"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="hsl(var(--chart-1))"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                className={
                  onSegmentClick ? "cursor-pointer transition-opacity hover:opacity-80" : ""
                }
                onClick={() => onSegmentClick?.(entry.key ?? entry.label, entry.label)}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground">{data.label}</p>
                    <p className="text-muted-foreground">
                      {data.count} ({data.percentage.toFixed(1)}%)
                    </p>
                    {onSegmentClick && (
                      <p className="text-xs text-primary mt-1">Clique para ver detalhes</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: { payload?: { name?: string; value?: number } }) => (
              <span className="text-sm text-foreground">{entry.payload.label}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
