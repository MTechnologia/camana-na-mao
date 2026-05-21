import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PlatformContentCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/**
 * Card de conteúdo padronizado.
 * Use apenas quando o filho NÃO traz outro card (ChartCard, ReferralRulesEditor, etc.).
 * Se o filho já é um card, prefira {@link PlatformSectionHeading} + o componente direto.
 */
export function PlatformContentCard({
  title,
  description,
  children,
  className,
  bodyClassName,
}: PlatformContentCardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border/80 bg-muted/30 px-4 py-3 md:px-5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className={cn(title ? 'p-4 md:p-5' : 'p-0', bodyClassName)}>{children}</div>
    </section>
  );
}
