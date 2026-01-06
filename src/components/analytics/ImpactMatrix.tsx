import { motion } from 'framer-motion';

interface MatrixData {
  category: string;
  critical: number;
  moderate: number;
  low: number;
  none: number;
}

interface ImpactMatrixProps {
  data: MatrixData[];
  onCellClick?: (category: string, riskLevel: string) => void;
}

export const ImpactMatrix = ({ data, onCellClick }: ImpactMatrixProps) => {
  const getIntensity = (value: number, max: number): string => {
    if (max === 0) return 'bg-muted';
    const intensity = value / max;
    if (intensity > 0.7) return 'bg-destructive/80';
    if (intensity > 0.4) return 'bg-chart-3/80';
    if (intensity > 0.1) return 'bg-chart-2/60';
    if (value > 0) return 'bg-chart-1/40';
    return 'bg-muted/30';
  };

  const maxValue = Math.max(
    ...data.flatMap(d => [d.critical, d.moderate, d.low, d.none])
  );

  const riskLevels = ['critical', 'moderate', 'low', 'none'] as const;
  const riskLabels = {
    critical: 'Crítico',
    moderate: 'Moderado',
    low: 'Baixo',
    none: 'Nenhum'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full overflow-x-auto"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium text-muted-foreground">Categoria</th>
            {riskLevels.map(level => (
              <th key={level} className="text-center p-2 font-medium text-muted-foreground min-w-[80px]">
                {riskLabels[level]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <motion.tr
              key={row.category}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border-b border-border/50"
            >
              <td className="p-2 font-medium text-foreground capitalize">{row.category}</td>
              {riskLevels.map(level => {
                const value = row[level];
                return (
                  <td 
                    key={level} 
                    className="p-2 text-center"
                    onClick={() => onCellClick?.(row.category, level)}
                  >
                    <div
                      className={`
                        rounded-md py-1.5 px-2 text-foreground font-medium
                        ${getIntensity(value, maxValue)}
                        ${onCellClick ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}
                      `}
                    >
                      {value}
                    </div>
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
