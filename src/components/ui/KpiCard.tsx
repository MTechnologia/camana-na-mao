import { ParameterInfoTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { Card, CardContent } from '@/components/ui/card';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  parameter?: ParameterLegendItem;
  /** Exibe o botão de ajuda (?) no cartão. */
  showParameter?: boolean;
  stopParameterPropagation?: boolean;
  compact?: boolean;
  className?: string;
  /** Abre painel lateral ou ação ao clicar no cartão (exceto no botão ?). */
  onOpenDetail?: () => void;
};

export function KpiCard({
  label,
  value,
  hint,
  parameter,
  showParameter = true,
  stopParameterPropagation,
  compact = false,
  className,
  onOpenDetail,
}: KpiCardProps) {
  const interactive = Boolean(onOpenDetail);

  return (
    <Card
      className={cn(
        'h-full',
        interactive && 'cursor-pointer transition-colors hover:bg-muted/40',
        className,
      )}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpenDetail : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenDetail?.();
              }
            }
          : undefined
      }
    >
      <CardContent className={compact ? 'p-3.5' : 'p-4'}>
        <div className="flex items-start justify-between gap-2">
          <p
            className={
              compact
                ? 'text-sm font-medium text-muted-foreground'
                : 'text-xs font-medium uppercase tracking-wide text-muted-foreground'
            }
          >
            {label}
          </p>
          {showParameter && parameter ? (
            <ParameterInfoTrigger
              item={parameter}
              stopPropagation={stopParameterPropagation}
            />
          ) : null}
        </div>
        <p
          className={
            compact
              ? 'mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground'
              : 'mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground'
          }
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : interactive ? (
          <p className="mt-1 text-xs text-primary">Clique para ver a lista de relatos</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
