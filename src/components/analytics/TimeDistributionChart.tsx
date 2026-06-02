import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TimeDistributionChartProps {
  data: { label: string; count: number }[];
  title: string;
  type: "hour" | "weekday";
  onBarClick?: (label: string) => void;
}

export const TimeDistributionChart = ({
  data,
  title,
  type,
  onBarClick,
}: TimeDistributionChartProps) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getBarColor = (count: number) => {
    const intensity = count / maxCount;
    if (intensity < 0.25) return "hsl(var(--muted-foreground))";
    if (intensity < 0.5) return "hsl(var(--primary) / 0.5)";
    if (intensity < 0.75) return "hsl(var(--primary) / 0.75)";
    return "hsl(var(--primary))";
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={type === "hour" ? 2 : 0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value, "Relatos"]}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              onClick={(data) => onBarClick?.(data.label)}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.count)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
