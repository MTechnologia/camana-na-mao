import { ChevronDown } from 'lucide-react';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

export type ParameterLegendSection = {
  title: string;
  items: ParameterLegendItem[];
};

type ParameterLegendProps = {
  items: ParameterLegendItem[];
  prependSection?: ParameterLegendSection;
  title?: string;
  className?: string;
  variant?: 'collapsible' | 'always';
  defaultOpen?: boolean;
};

type LegendDensity = 'compact' | 'modal';

function LegendBody({ items, density = 'compact' }: { items: ParameterLegendItem[]; density?: LegendDensity }) {
  if (items.length === 0) return null;
  const modal = density === 'modal';

  return (
    <dl className={cn(modal ? 'space-y-3' : 'space-y-2')}>
      {items.map((item) => (
        <div
          key={item.term}
          className={cn(
            modal
              ? 'rounded-lg border border-border/70 bg-card px-4 py-3.5 shadow-sm'
              : 'text-[11px] leading-snug',
          )}
        >
          <dt
            className={cn(
              'font-semibold text-foreground',
              modal ? 'text-sm leading-snug' : 'font-medium',
            )}
          >
            {item.term}
          </dt>
          <dd className={cn('text-muted-foreground', modal ? 'mt-2 text-sm leading-relaxed' : 'mt-0.5')}>
            {item.description}
          </dd>
          {item.formula ? (
            <dd
              className={cn(
                'rounded-md bg-muted/60 text-foreground/90',
                modal ? 'mt-3 border border-border/50 px-3 py-2.5 text-xs leading-relaxed' : 'mt-1 px-2 py-1 font-mono text-[10px] leading-relaxed',
                !modal && 'font-mono',
              )}
            >
              <span
                className={cn(
                  'block font-sans font-medium text-muted-foreground',
                  modal ? 'mb-1 text-[11px] uppercase tracking-wide' : '',
                )}
              >
                Como calculamos
              </span>
              <span className={modal ? 'font-mono text-[13px] leading-relaxed' : undefined}>{item.formula}</span>
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

function LegendSectionBlock({
  section,
  density = 'compact',
}: {
  section: ParameterLegendSection;
  density?: LegendDensity;
}) {
  const modal = density === 'modal';
  return (
    <div className={cn(modal && 'rounded-lg border border-border/70 bg-muted/20 px-4 py-3.5')}>
      <p className={cn('font-medium text-foreground', modal ? 'mb-3 text-sm' : 'mb-2 text-xs')}>
        {section.title}
      </p>
      <LegendBody items={section.items} density={density} />
    </div>
  );
}

export function ParameterLegendContent({
  prependSection,
  items,
  density = 'compact',
}: {
  prependSection?: ParameterLegendSection;
  items: ParameterLegendItem[];
  density?: LegendDensity;
}) {
  const hasMain = items.length > 0;
  const hasPrepend = Boolean(prependSection?.items.length);
  const modal = density === 'modal';

  if (!hasPrepend && !hasMain) return null;

  return (
    <div className={cn(modal && 'space-y-4')}>
      {prependSection && hasPrepend ? (
        <LegendSectionBlock section={prependSection} density={density} />
      ) : null}
      {hasPrepend && hasMain ? (
        <div className={cn('border-t border-border/60', modal ? 'my-1' : 'my-3')} aria-hidden />
      ) : null}
      {hasMain ? <LegendBody items={items} density={density} /> : null}
    </div>
  );
}

export function ParameterLegend({
  items,
  prependSection,
  title = 'Parâmetros',
  className,
  variant = 'collapsible',
  defaultOpen = false,
}: ParameterLegendProps) {
  const hasContent = items.length > 0 || Boolean(prependSection?.items.length);
  if (!hasContent) return null;

  if (variant === 'always') {
    return (
      <section
        className={cn('rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5', className)}
        aria-label={title}
      >
        <p className="mb-2 text-xs font-medium text-foreground">{title}</p>
        <ParameterLegendContent prependSection={prependSection} items={items} />
      </section>
    );
  }

  return (
    <details
      className={cn('group rounded-lg border border-border/80 bg-muted/20', className)}
      open={defaultOpen || undefined}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2',
          'text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <span>{title}</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/60 px-3 pb-2.5 pt-2">
        <ParameterLegendContent prependSection={prependSection} items={items} />
      </div>
    </details>
  );
}
