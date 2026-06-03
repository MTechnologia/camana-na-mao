import { CompactBarChart } from "./CompactBarChart";

interface RiskLevelData {
  level: string;
  count: number;
  percentage: number;
  color: string;
}

interface RiskDistributionProps {
  data: RiskLevelData[];
  onSegmentClick?: (level: string) => void;
}

export const RiskDistribution = ({ data, onSegmentClick }: RiskDistributionProps) => {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartData = data.map((item) => ({
    label: item.level,
    value: item.count,
    color: item.color,
  }));

  return (
    <div className="w-full h-full">
      <CompactBarChart data={chartData} total={total} onItemClick={onSegmentClick} />
    </div>
  );
};
