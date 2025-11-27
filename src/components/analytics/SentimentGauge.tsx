import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SentimentGaugeProps {
  score: number; // 0-100
  trend?: number; // % change
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SentimentGauge = ({ 
  score, 
  trend, 
  label = 'Índice de Satisfação',
  size = 'md' 
}: SentimentGaugeProps) => {
  const getColor = (value: number) => {
    if (value >= 70) return 'hsl(var(--chart-1))'; // green
    if (value >= 40) return 'hsl(var(--chart-3))'; // yellow
    return 'hsl(var(--chart-5))'; // red
  };

  const getSentimentLabel = (value: number) => {
    if (value >= 70) return 'Positivo';
    if (value >= 40) return 'Neutro';
    return 'Negativo';
  };

  const sizes = {
    sm: { gauge: 120, stroke: 12, text: 'text-2xl' },
    md: { gauge: 160, stroke: 16, text: 'text-4xl' },
    lg: { gauge: 200, stroke: 20, text: 'text-5xl' }
  };

  const config = sizes[size];
  const radius = (config.gauge - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: config.gauge, height: config.gauge }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={config.gauge} height={config.gauge}>
          <circle
            cx={config.gauge / 2}
            cy={config.gauge / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={config.stroke}
            fill="none"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx={config.gauge / 2}
            cy={config.gauge / 2}
            r={radius}
            stroke={getColor(score)}
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className={cn('font-bold text-foreground', config.text)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {Math.round(score)}%
          </motion.span>
          <span className="text-sm text-muted-foreground font-medium">
            {getSentimentLabel(score)}
          </span>
        </div>
      </div>

      {/* Label and trend */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center justify-center gap-1 text-xs font-medium mt-1',
            trend > 0 ? 'text-chart-1' : trend < 0 ? 'text-chart-5' : 'text-muted-foreground'
          )}>
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>{trend > 0 ? '+' : ''}{trend}% vs período anterior</span>
          </div>
        )}
      </div>
    </div>
  );
};
