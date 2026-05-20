import type { ReactNode } from 'react';
import { ParameterInfoTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

export { KpiCard } from '@/components/ui/KpiCard';

type PageShellProps = {
  title: string;
  description?: string;
  titleInfo?: ParameterLegendItem;
  children?: ReactNode;
  actions?: ReactNode;
};

export function PageShell({ title, description, titleInfo, children, actions }: PageShellProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            {title}
            {titleInfo ? (
              <ParameterInfoTrigger item={titleInfo} className="h-5 w-5 text-[11px]" />
            ) : null}
          </h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function PlaceholderPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center',
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
