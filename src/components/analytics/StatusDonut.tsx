import { CompactBarChart } from "./CompactBarChart";

interface StatusData {
  status: string;
  count: number;
  color: string;
}

interface StatusDonutProps {
  data: StatusData[];
  total: number;
  onSegmentClick?: (status: string) => void;
}

export const StatusDonut = ({ data, total, onSegmentClick }: StatusDonutProps) => {
  // Semantic colors for status
  const statusColorMap: Record<string, string> = {
    Pendente: "hsl(var(--chart-3))", // Yellow
    "Em Análise": "hsl(var(--chart-2))", // Blue
    Resolvido: "hsl(var(--chart-1))", // Green
    Rejeitado: "hsl(var(--chart-5))", // Red
  };

  const chartData = data.map((item) => ({
    label: item.status,
    value: item.count,
    color: item.color || statusColorMap[item.status] || "hsl(var(--chart-4))",
  }));

  return (
    <div className="w-full h-full">
      <CompactBarChart data={chartData} total={total} onItemClick={onSegmentClick} />
    </div>
  );
};
