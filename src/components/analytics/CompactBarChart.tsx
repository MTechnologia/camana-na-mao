import { motion } from 'framer-motion';

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface CompactBarChartProps {
  data: BarData[];
  total: number;
  onItemClick?: (label: string) => void;
  showPercentage?: boolean;
}

export const CompactBarChart = ({ 
  data, 
  total, 
  onItemClick,
  showPercentage = true 
}: CompactBarChartProps) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full h-full flex flex-col justify-center gap-3 p-2">
      {data.map((item, index) => {
        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
        const barWidth = total > 0 ? (item.value / maxValue) * 100 : 0;

        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 ${onItemClick ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={() => onItemClick?.(item.label)}
          >
            {/* Label */}
            <span className="text-sm text-muted-foreground w-24 truncate shrink-0">
              {item.label}
            </span>

            {/* Bar container */}
            <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
              />
            </div>

            {/* Value */}
            <div className="text-right shrink-0 min-w-[70px]">
              <span className="text-sm font-semibold text-foreground">{item.value}</span>
              {showPercentage && (
                <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Total */}
      <div className="pt-2 border-t border-border mt-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">{total}</span>
        </div>
      </div>
    </div>
  );
};
