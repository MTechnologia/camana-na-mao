import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface AgeGroupData {
  ageGroup: string;
  count: number;
  percentage: number;
}

interface AgePyramidProps {
  data: AgeGroupData[];
}

export const AgePyramid = ({ data }: AgePyramidProps) => {
  // Sort by age group order
  const ageOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const sortedData = [...data].sort((a, b) => {
    return ageOrder.indexOf(a.ageGroup) - ageOrder.indexOf(b.ageGroup);
  }).reverse(); // Reverse to show oldest at top

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
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={`hsl(var(--chart-${(index % 5) + 1}))`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
