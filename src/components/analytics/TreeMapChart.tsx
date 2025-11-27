import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface TreeMapData {
  name: string;
  size: number;
  sentiment?: number; // 0-100
}

interface TreeMapChartProps {
  data: TreeMapData[];
  onCellClick?: (name: string) => void;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const TreeMapChart = ({ data, onCellClick }: TreeMapChartProps) => {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  const CustomContent = (props: any) => {
    const { x, y, width, height, name, size, fill } = props;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill,
            stroke: 'hsl(var(--background))',
            strokeWidth: 2,
            cursor: 'pointer',
          }}
          className="hover:opacity-80 transition-opacity"
          onClick={() => onCellClick?.(name)}
        />
        {width > 60 && height > 40 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 8}
              textAnchor="middle"
              fill="white"
              fontSize={14}
              fontWeight="600"
            >
              {name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="white"
              fontSize={12}
            >
              {size}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={chartData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="hsl(var(--background))"
          fill="hsl(var(--chart-1))"
          content={<CustomContent />}
        >
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground">{data.name}</p>
                    <p className="text-muted-foreground">{data.size} relatos</p>
                    {data.sentiment !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        Sentimento: {data.sentiment.toFixed(0)}%
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </motion.div>
  );
};
