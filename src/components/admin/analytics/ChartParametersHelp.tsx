import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ParameterLegendContent,
  type ParameterLegendSection,
} from '@/components/admin/analytics/ParameterLegend';
import { cn } from '@/lib/utils';

type ChartParametersHelpProps = {
  items: ParameterLegendItem[];
  prependSection?: ParameterLegendSection;
  title?: string;
  chartTitle?: string;
  className?: string;
};

const overlayClass = cn(
  'fixed inset-0 z-50 bg-black/45 backdrop-blur-[3px]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'duration-300 ease-out',
);

const contentClass = cn(
  'fixed left-[50%] top-[50%] z-50 flex w-[calc(100%-1.5rem)] max-w-xl translate-x-[-50%] translate-y-[-50%] flex-col',
  'overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xl sm:max-w-2xl',
  'outline-none',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  'data-[state=closed]:slide-out-to-bottom-3 data-[state=open]:slide-in-from-bottom-4',
  'duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
  'max-h-[min(90dvh,40rem)]',
);

export function ChartParametersHelp({
  items,
  prependSection,
  title = 'Parâmetros',
  chartTitle,
  className,
}: ChartParametersHelpProps) {
  const hasContent = items.length > 0 || Boolean(prependSection?.items.length);
  if (!hasContent) return null;

  const ariaLabel = chartTitle ? `Parâmetros do gráfico: ${chartTitle}` : `Parâmetros: ${title}`;

  return (
    <DialogPrimitive.Root>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                'border border-muted-foreground/35 bg-background text-[11px] font-semibold leading-none text-muted-foreground shadow-sm',
                'transition-colors duration-200',
                'hover:border-muted-foreground/55 hover:bg-muted/50 hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'data-[state=open]:border-muted-foreground/55 data-[state=open]:bg-muted/50 data-[state=open]:text-foreground',
                className,
              )}
              aria-label={ariaLabel}
            >
              P
            </button>
          </DialogPrimitive.Trigger>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Ver parâmetros
        </TooltipContent>
      </Tooltip>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClass} />
        <DialogPrimitive.Content className={contentClass}>
          <div className="relative shrink-0 border-b border-border/80 bg-muted/30 px-5 py-4 pr-12 sm:px-6">
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </DialogPrimitive.Title>
            {chartTitle ? (
              <DialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {chartTitle}
              </DialogPrimitive.Description>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scroll-smooth sm:px-6 sm:py-6">
            <ParameterLegendContent
              prependSection={prependSection}
              items={items}
              density="modal"
            />
          </div>

          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full',
              'text-muted-foreground transition-all duration-200',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
