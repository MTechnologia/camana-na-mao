import { ChevronDown } from 'lucide-react';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

type LegendSection = {
  title: string;
  items: ParameterLegendItem[];
};

type ParameterLegendProps = {
  items: ParameterLegendItem[];
  /** Seção exibida no topo do conteúdo (ex.: polaridades de sentimento). */
  prependSection?: LegendSection;
  title?: string;
  className?: string;
  /** `always` — bloco sempre visível; `collapsible` — acordeão (padrão). */
  variant?: 'collapsible' | 'always';
  defaultOpen?: boolean;
};

function LegendBody({ items }: { items: ParameterLegendItem[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="space-y-2">
      {items.map((item) => (
        <div key={item.term} className="text-[11px] leading-snug">
          <dt className="font-medium text-foreground">{item.term}</dt>
          <dd className="mt-0.5 text-muted-foreground">{item.description}</dd>
          {item.formula ? (
            <dd className="mt-1 rounded bg-background/80 px-2 py-1 font-mono text-[10px] leading-relaxed text-foreground/85">
              <span className="font-sans font-medium text-muted-foreground">Como calculamos: </span>
              {item.formula}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

function LegendSectionBlock({ section }: { section: LegendSection }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground">{section.title}</p>
      <LegendBody items={section.items} />
    </div>
  );
}

function LegendContent({
  prependSection,
  items,
}: {
  prependSection?: LegendSection;
  items: ParameterLegendItem[];
}) {
  const hasMain = items.length > 0;
  const hasPrepend = Boolean(prependSection?.items.length);

  if (!hasPrepend && !hasMain) return null;

  return (
    <>
      {prependSection && hasPrepend ? <LegendSectionBlock section={prependSection} /> : null}
      {hasPrepend && hasMain ? <div className="my-3 border-t border-border/60" aria-hidden /> : null}
      {hasMain ? <LegendBody items={items} /> : null}
    </>
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
        className={cn(
          'rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5',
          className,
        )}
        aria-label={title}
      >
        <p className="mb-2 text-xs font-medium text-foreground">{title}</p>
        <LegendContent prependSection={prependSection} items={items} />
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
        <LegendContent prependSection={prependSection} items={items} />
      </div>
    </details>
  );
}
