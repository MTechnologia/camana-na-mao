import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FunnelStep {
  label: string;
  count: number;
  percentage: number;
  color?: string;
}

interface EngagementFunnelProps {
  steps: FunnelStep[];
  onStepClick?: (step: FunnelStep) => void;
}

export const EngagementFunnel = ({ steps, onStepClick }: EngagementFunnelProps) => {
  const maxCount = steps[0]?.count || 1;

  const colors = [
    'hsl(var(--chart-2))',
    'hsl(var(--chart-6))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-1))',
  ];

  return (
    <div className="w-full space-y-3">
      {steps.map((step, index) => {
        const width = (step.count / maxCount) * 100;
        const color = step.color || colors[index % colors.length];
        
        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn("relative", onStepClick && "cursor-pointer group")}
            onClick={() => onStepClick?.(step)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {step.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {step.count} ({step.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="relative h-12 bg-muted rounded-lg overflow-hidden group-hover:ring-2 group-hover:ring-primary/20 transition-all">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="h-full flex items-center px-4 group-hover:opacity-90 transition-opacity"
                style={{ backgroundColor: color }}
              >
                <span className="text-sm font-semibold text-white">
                  {step.percentage.toFixed(0)}%
                </span>
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
