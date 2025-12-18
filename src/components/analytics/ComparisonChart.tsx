import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface ComparisonData {
  label: string;
  value1: number;
  value2: number;
}

interface ComparisonChartProps {
  data: ComparisonData[];
  label1: string;
  label2: string;
  color1?: string;
  color2?: string;
  onBarClick?: (source: 'value1' | 'value2', label: string) => void;
}

export const ComparisonChart = ({ 
  data, 
  label1, 
  label2,
  color1 = 'hsl(var(--chart-1))',
  color2 = 'hsl(var(--chart-2))',
  onBarClick
}: ComparisonChartProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="label" 
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground mb-2">
                      {payload[0].payload.label}
                    </p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                      </p>
                    ))}
                    {onBarClick && (
                      <p className="text-xs text-primary mt-2">Clique para ver detalhes</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Bar 
            dataKey="value1" 
            name={label1}
            fill={color1} 
            radius={[4, 4, 0, 0]}
            onClick={(data) => onBarClick?.('value1', data.label)}
            className={onBarClick ? 'cursor-pointer' : ''}
          />
          <Bar 
            dataKey="value2" 
            name={label2}
            fill={color2} 
            radius={[4, 4, 0, 0]}
            onClick={(data) => onBarClick?.('value2', data.label)}
            className={onBarClick ? 'cursor-pointer' : ''}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
