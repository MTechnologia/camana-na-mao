import { motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onDrillDown?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  className?: string;
  lastUpdated?: string;
}

export const ChartCard = ({
  title,
  subtitle,
  children,
  onDrillDown,
  onExport,
  onFullscreen,
  className,
  lastUpdated,
}: ChartCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card rounded-xl border border-border p-6',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onDrillDown && (
              <DropdownMenuItem onClick={onDrillDown}>
                Drill Down
              </DropdownMenuItem>
            )}
            {onExport && (
              <DropdownMenuItem onClick={onExport}>
                Exportar dados
              </DropdownMenuItem>
            )}
            {onFullscreen && (
              <DropdownMenuItem onClick={onFullscreen}>
                Tela cheia
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-[300px]">
        {children}
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground mt-4 text-right">
          Atualizado em {lastUpdated}
        </p>
      )}
    </motion.div>
  );
};
