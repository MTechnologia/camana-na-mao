import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeatmapData {
  x: string;
  y: string;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  onCellClick?: (cell: HeatmapData) => void;
}

export const HeatmapChart = ({ data, onCellClick }: HeatmapChartProps) => {
  // Get unique x and y values
  const xLabels = Array.from(new Set(data.map((d) => d.x))).sort();
  const yLabels = Array.from(new Set(data.map((d) => d.y))).sort();

  // Calculate max value for color scale
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    const hue = (1 - normalized) * 120; // 120 = green, 0 = red
    return `hsl(${hue}, 70%, 50%)`;
  };

  const getCellData = (x: string, y: string) => {
    return data.find((d) => d.x === x && d.y === y);
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Y-axis labels */}
        <div className="flex">
          <div className="w-24" />
          {xLabels.map((label) => (
            <div
              key={label}
              className="flex-1 text-center text-xs font-medium text-muted-foreground mb-2"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        {yLabels.map((yLabel, yIndex) => (
          <div key={yLabel} className="flex items-center">
            {/* Y-axis label */}
            <div className="w-24 text-xs font-medium text-muted-foreground text-right pr-2">
              {yLabel}
            </div>

            {/* Cells */}
            {xLabels.map((xLabel, xIndex) => {
              const cellData = getCellData(xLabel, yLabel);
              const value = cellData?.value || 0;

              return (
                <motion.div
                  key={`${xLabel}-${yLabel}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (yIndex * xLabels.length + xIndex) * 0.01 }}
                  className={cn(
                    "flex-1 aspect-square m-0.5 rounded flex items-center justify-center",
                    "text-xs font-medium transition-all",
                    cellData && onCellClick && "cursor-pointer hover:ring-2 hover:ring-primary",
                  )}
                  style={{
                    backgroundColor: cellData ? getColor(value) : "hsl(var(--muted))",
                    color: value > (maxValue - minValue) / 2 ? "white" : "black",
                  }}
                  onClick={() => cellData && onCellClick?.(cellData)}
                  whileHover={cellData && onCellClick ? { scale: 1.1 } : {}}
                >
                  {value > 0 ? value : ""}
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Menor</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <div
                key={ratio}
                className="w-8 h-4 rounded"
                style={{
                  backgroundColor: getColor(minValue + ratio * (maxValue - minValue)),
                }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Maior</span>
        </div>
      </div>
    </div>
  );
};
