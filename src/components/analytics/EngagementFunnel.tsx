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
}

export const EngagementFunnel = ({ steps }: EngagementFunnelProps) => {
  const maxCount = steps[0]?.count || 1;

  // Gradient colors for funnel stages
  const colors = [
    'hsl(var(--chart-2))',  // Blue - Created
    'hsl(var(--chart-6))',  // Cyan - With Interaction
    'hsl(var(--chart-3))',  // Yellow - Supported
    'hsl(var(--chart-1))',  // Green - Resolved
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
            className="relative"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground">{step.label}</span>
              <span className="text-sm text-muted-foreground">
                {step.count} ({step.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="h-full flex items-center px-4"
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
