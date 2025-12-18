import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface SentimentDonutProps {
  data: {
    positive: number;
    neutral: number;
    negative: number;
  };
  total: number;
  onSegmentClick?: (sentiment: 'positive' | 'neutral' | 'negative') => void;
}

export const SentimentDonut = ({ data, total, onSegmentClick }: SentimentDonutProps) => {
  const chartData = [
    { name: 'Positivo', value: data.positive, color: 'hsl(var(--chart-1))' },
    { name: 'Neutro', value: data.neutral, color: 'hsl(var(--chart-3))' },
    { name: 'Negativo', value: data.negative, color: 'hsl(var(--chart-5))' },
  ];

  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / total) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <div className="w-full h-full flex flex-col relative">
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
            onClick={(entry) => {
              const sentiment = entry.name.toLowerCase() as 'positive' | 'neutral' | 'negative';
              onSegmentClick?.(sentiment);
            }}
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
                const data = payload[0];
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-medium text-foreground">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.value} relatos ({((data.value as number / total) * 100).toFixed(1)}%)
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
                {value} ({entry.payload.value})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <motion.p 
            className="text-3xl font-bold text-foreground"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {total.toLocaleString('pt-BR')}
          </motion.p>
          <p className="text-sm text-muted-foreground">Total de relatos</p>
        </div>
      </div>
    </div>
  );
};
