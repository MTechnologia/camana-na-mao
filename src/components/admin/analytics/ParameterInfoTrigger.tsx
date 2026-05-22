import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent, type PointerEvent } from 'react';
import { Info } from 'lucide-react';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function ParameterInfoBody({ item }: { item: ParameterLegendItem }) {
  return (
    <>
      <p className="font-medium text-foreground">{item.term}</p>
      <p className="leading-relaxed text-muted-foreground">{item.description}</p>
      {item.formula ? (
        <p className="rounded-md bg-muted/60 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/90">
          <span className="font-medium text-muted-foreground">Como calculamos: </span>
          {item.formula}
        </p>
      ) : null}
    </>
  );
}

type InfoButtonProps = ComponentPropsWithoutRef<'button'> & {
  'aria-label': string;
};

const InfoTriggerButton = forwardRef<HTMLButtonElement, InfoButtonProps>(
  ({ className, type = 'button', onClick, onPointerDown, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
          'text-muted-foreground/70 transition-colors',
          'hover:bg-muted/80 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          className,
        )}
        onClick={onClick}
        onPointerDown={onPointerDown}
        {...props}
      />
    );
  },
);
InfoTriggerButton.displayName = 'InfoTriggerButton';

type ParameterInfoTriggerProps = {
  item: ParameterLegendItem;
  className?: string;
  stopPropagation?: boolean;
};

/** Ajuda pontual (ícone ℹ️) — use só em métricas ou filtros onde o cálculo não é óbvio. */
export function ParameterInfoTrigger({
  item,
  className,
  stopPropagation = false,
}: ParameterInfoTriggerProps) {
  const stopIfNeeded = (e: MouseEvent | PointerEvent) => {
    if (stopPropagation) e.stopPropagation();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InfoTriggerButton
          className={className}
          aria-label={`Informação: ${item.term}`}
          onClick={stopIfNeeded}
          onPointerDown={stopIfNeeded}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </InfoTriggerButton>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="end"
        className="max-w-[min(100vw-2rem,20rem)] space-y-1.5 border-border p-3 text-left text-xs shadow-lg"
      >
        <ParameterInfoBody item={item} />
      </TooltipContent>
    </Tooltip>
  );
}

type ParameterInfoListTriggerProps = {
  items: ParameterLegendItem[];
  ariaLabel?: string;
  className?: string;
  tooltipTitle?: string;
};

/** Lista de legendas — preferir `ChartParametersHelp` (botão P) em gráficos. */
export function ParameterInfoListTrigger({
  items,
  ariaLabel = 'Informações sobre indicadores',
  className,
  tooltipTitle = 'Indicadores analisados',
}: ParameterInfoListTriggerProps) {
  if (items.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InfoTriggerButton className={className} aria-label={ariaLabel}>
          <Info className="h-3.5 w-3.5" aria-hidden />
        </InfoTriggerButton>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="end"
        className="max-w-[min(100vw-2rem,22rem)] border-border p-3 text-left text-xs shadow-lg"
      >
        <p className="mb-2 font-medium text-foreground">{tooltipTitle}</p>
        <div className="max-h-[min(50vh,16rem)] space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.term} className="space-y-1 border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <ParameterInfoBody item={item} />
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
