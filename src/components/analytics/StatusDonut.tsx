import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

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
  const chartData = data.map(item => ({
    name: item.status,
    value: item.count,
    color: item.color,
    percentage: ((item.count / total) * 100).toFixed(1)
  }));

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`;
  };

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
            onClick={(data) => onSegmentClick?.(data.name)}
            className="cursor-pointer"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                className="hover:opacity-80 transition-opacity"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground">{data.name}</p>
                    <p className="text-muted-foreground">
                      {data.value} relatos ({data.percentage}%)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-sm text-foreground">
                {value} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center label */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
      >
        <p className="text-3xl font-bold text-foreground">{total}</p>
        <p className="text-sm text-muted-foreground">Total</p>
      </motion.div>
    </div>
  );
};
