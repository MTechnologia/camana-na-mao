import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface AgeGroupData {
  ageGroup: string;
  /** Chave canônica (ex.: 35_44, not_informed) para drill-down. */
  key?: string;
  count: number;
  percentage: number;
}

interface AgePyramidProps {
  data: AgeGroupData[];
  onBarClick?: (ageGroup: string) => void;
}

export const AgePyramid = ({ data, onBarClick }: AgePyramidProps) => {
  const ageOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const sortedData = [...data].sort((a, b) => {
    return ageOrder.indexOf(a.ageGroup) - ageOrder.indexOf(b.ageGroup);
  }).reverse();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            type="number" 
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            type="category" 
            dataKey="ageGroup" 
            width={80}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground">{data.ageGroup} anos</p>
                    <p className="text-muted-foreground">
                      {data.count} ({data.percentage.toFixed(1)}%)
                    </p>
                    {onBarClick && (
                      <p className="text-xs text-primary mt-1">Clique para ver detalhes</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="percentage" 
            fill="hsl(var(--chart-1))"
            radius={[0, 4, 4, 0]}
            onClick={(data) => onBarClick?.(data.key ?? data.ageGroup)}
            className={onBarClick ? 'cursor-pointer' : ''}
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                className={onBarClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
