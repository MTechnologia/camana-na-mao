import { ArrowDown, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface DriverData {
  category: string;
  icon: string;
  change: number; // percentage
  impact: 'high' | 'medium' | 'low';
  total: number;
}

interface SentimentDriversProps {
  drivers: DriverData[];
  onDriverClick?: (category: string) => void;
}

export const SentimentDrivers = ({ drivers, onDriverClick }: SentimentDriversProps) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'Alto impacto';
      case 'medium':
        return 'Médio';
      default:
        return 'Baixo';
    }
  };

  const sortedDrivers = [...drivers].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return (
    <div className="w-full space-y-3">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        O que está impulsionando o sentimento?
      </h3>
      
      {sortedDrivers.map((driver, index) => (
        <motion.button
          key={driver.category}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onDriverClick?.(driver.category)}
          className="w-full p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            {/* Icon and name */}
            <span className="text-2xl">{driver.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{driver.category}</p>
              <p className="text-xs text-muted-foreground">{driver.total} relatos</p>
            </div>

            {/* Progress bar */}
            <div className="flex-1 max-w-[200px]">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.abs(driver.change)}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                  className={cn(
                    'h-full rounded-full',
                    driver.change > 0 ? 'bg-chart-1' : 'bg-chart-5'
                  )}
                />
              </div>
            </div>

            {/* Change indicator */}
            <div className={cn(
              'flex items-center gap-1 font-semibold min-w-[60px]',
              driver.change > 0 ? 'text-chart-1' : 'text-chart-5'
            )}>
              {driver.change > 0 ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              <span>{Math.abs(driver.change)}%</span>
            </div>

            {/* Impact badge */}
            <Badge variant={getImpactColor(driver.impact)} className="min-w-[90px] justify-center">
              {getImpactLabel(driver.impact)}
            </Badge>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
