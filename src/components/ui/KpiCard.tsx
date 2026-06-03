import { ParameterInfoTrigger } from "@/components/admin/analytics/ParameterInfoTrigger";
import { Card, CardContent } from "@/components/ui/card";
import type { ParameterLegendItem } from "@/lib/analyticsParameterLegends";

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  parameter?: ParameterLegendItem;
  stopParameterPropagation?: boolean;
  /** Abre painel lateral ou ação ao clicar no cartão (exceto no botão ?). */
  onOpenDetail?: () => void;
};

export function KpiCard({
  label,
  value,
  hint,
  parameter,
  stopParameterPropagation,
  onOpenDetail,
}: KpiCardProps) {
  const interactive = Boolean(onOpenDetail);

  return (
    <Card
      className={
        interactive ? "h-full cursor-pointer transition-colors hover:bg-muted/40" : "h-full"
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpenDetail : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenDetail?.();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {parameter ? (
            <ParameterInfoTrigger item={parameter} stopPropagation={stopParameterPropagation} />
          ) : null}
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
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
