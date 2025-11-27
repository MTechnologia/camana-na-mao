import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface CategoryData {
  category: string;
  count: number;
  color?: string;
}

interface CategoryBarChartProps {
  data: CategoryData[];
  onBarClick?: (category: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const CategoryBarChart = ({ 
  data, 
  onBarClick, 
  orientation = 'horizontal' 
}: CategoryBarChartProps) => {
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10);
  
  // Vibrant color palette
  const colors = [
    'hsl(var(--chart-2))',  // Blue
    'hsl(var(--chart-4))',  // Purple
    'hsl(var(--chart-6))',  // Cyan
    'hsl(var(--chart-7))',  // Pink
    'hsl(var(--chart-3))',  // Yellow
    'hsl(var(--chart-1))',  // Green
    'hsl(var(--chart-8))',  // Gold
    'hsl(var(--chart-5))',  // Red
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          {orientation === 'horizontal' ? (
            <>
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis 
                type="category" 
                dataKey="category" 
                width={120}
                stroke="hsl(var(--muted-foreground))"
              />
            </>
          ) : (
            <>
              <XAxis 
                type="category" 
                dataKey="category"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis type="number" stroke="hsl(var(--muted-foreground))" />
            </>
          )}
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground">{data.category}</p>
                    <p className="text-muted-foreground">{data.count} relatos</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="count" 
            radius={[4, 4, 0, 0]}
            onClick={(data) => onBarClick?.(data.category)}
            className="cursor-pointer"
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                className="hover:opacity-80 transition-opacity"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
