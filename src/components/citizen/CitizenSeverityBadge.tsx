import { Badge } from '@/components/ui/badge';
import { AlertOctagon, AlertTriangle, CircleAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Configuração visual por severidade. Suporta urbano (critical/high/medium/low) e transporte (critica/alta/media/baixa). */
const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: typeof AlertOctagon }> = {
  critical: { label: 'Crítica', color: 'bg-red-500/15 text-red-700 border-red-500/30', icon: AlertOctagon },
  critica: { label: 'Crítica', color: 'bg-red-500/15 text-red-700 border-red-500/30', icon: AlertOctagon },
  high: { label: 'Alta', color: 'bg-orange-500/15 text-orange-700 border-orange-500/30', icon: AlertTriangle },
  alta: { label: 'Alta', color: 'bg-orange-500/15 text-orange-700 border-orange-500/30', icon: AlertTriangle },
  medium: { label: 'Média', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: CircleAlert },
  media: { label: 'Média', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: CircleAlert },
  low: { label: 'Baixa', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: CheckCircle2 },
  baixa: { label: 'Baixa', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: CheckCircle2 },
};

interface CitizenSeverityBadgeProps {
  severity: string | null | undefined;
  /** Exibe ícone ao lado do label (padrão: true) */
  showIcon?: boolean;
  /** Tamanho compacto (para filtros) */
  size?: 'default' | 'sm';
  className?: string;
}

/**
 * Badge visual de severidade para o cidadão (cores e ícones).
 * Usado em histórico de relatos, Minhas Contribuições e filtros.
 */
export function CitizenSeverityBadge({
  severity,
  showIcon = true,
  size = 'default',
  className,
}: CitizenSeverityBadgeProps) {
  if (!severity) return null;

  const key = severity.toLowerCase();
  const config = SEVERITY_CONFIG[key];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.color,
        'inline-flex items-center gap-1.5 font-medium',
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3'} aria-hidden />}
      {config.label}
    </Badge>
  );
}

/** Exporta a config para uso em listas (ex.: ReportFilters com cores) */
export { SEVERITY_CONFIG };
