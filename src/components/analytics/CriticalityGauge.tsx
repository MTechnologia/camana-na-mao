import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriticalityGaugeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const CriticalityGauge = ({ 
  score, 
  label = 'Índice de Criticidade',
  size = 'md',
  onClick
}: CriticalityGaugeProps) => {
  const getColor = (value: number) => {
    if (value < 30) return 'hsl(var(--chart-1))';
    if (value < 60) return 'hsl(var(--chart-3))';
    return 'hsl(var(--chart-5))';
  };

  const getLevel = (value: number) => {
    if (value < 30) return 'Baixo';
    if (value < 60) return 'Médio';
    return 'Alto';
  };

  const sizeClasses = {
    sm: { gauge: 'w-32 h-32', text: 'text-2xl', subtext: 'text-xs' },
    md: { gauge: 'w-48 h-48', text: 'text-4xl', subtext: 'text-sm' },
    lg: { gauge: 'w-64 h-64', text: 'text-5xl', subtext: 'text-base' }
  };

  const currentSize = sizeClasses[size];
  const color = getColor(score);
  const level = getLevel(score);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center",
        onClick && "cursor-pointer group"
      )}
      onClick={onClick}
    >
      <div className={cn(
        currentSize.gauge,
        "relative transition-transform",
        onClick && "group-hover:scale-105"
      )}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
          />
          
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          {score >= 60 && (
            <AlertTriangle className="h-6 w-6 text-chart-5 mb-1" />
          )}
          <p className={`${currentSize.text} font-bold`} style={{ color }}>
            {score}%
          </p>
          <p className={`${currentSize.subtext} text-muted-foreground`}>
            {level}
          </p>
        </motion.div>
      </div>
      
      <p className={cn(
        "text-sm font-medium text-foreground mt-4 text-center",
        onClick && "group-hover:text-primary transition-colors"
      )}>
        {label}
      </p>
      {onClick && (
        <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
          Clique para ver detalhes
        </p>
      )}
    </div>
  );
};
