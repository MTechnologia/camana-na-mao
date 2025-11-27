import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface CriticalityGaugeProps {
  score: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CriticalityGauge = ({ 
  score, 
  label = 'Índice de Criticidade',
  size = 'md' 
}: CriticalityGaugeProps) => {
  const getColor = (value: number) => {
    if (value < 30) return 'hsl(var(--chart-1))'; // Green
    if (value < 60) return 'hsl(var(--chart-3))'; // Yellow
    return 'hsl(var(--chart-5))'; // Red
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
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${currentSize.gauge}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
          />
          
          {/* Progress circle */}
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

        {/* Center content */}
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
      
      <p className="text-sm font-medium text-foreground mt-4 text-center">
        {label}
      </p>
    </div>
  );
};
