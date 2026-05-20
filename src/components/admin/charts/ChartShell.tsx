import type { ReactNode } from 'react';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { ParameterLegend } from '@/components/admin/analytics/ParameterLegend';
import { Card, CardContent } from '@/components/ui/card';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { SENTIMENT_POLARITY_PREPEND_SECTION } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

export function ChartCard({
  title,
  subtitle,
  legend,
  legendTitle,
  legendVariant = 'collapsible',
  showSentimentPolarity = false,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  legend?: ParameterLegendItem[];
  legendTitle?: string;
  legendVariant?: 'collapsible' | 'always';
  showSentimentPolarity?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="mb-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {title}
            {legend && legend.length > 0 ? (
              <ParameterInfoListTrigger
                items={legend}
                tooltipTitle={legendTitle ?? 'Parâmetros deste gráfico'}
                ariaLabel={`Parâmetros: ${title}`}
              />
            ) : null}
          </p>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
        {legend?.length || showSentimentPolarity ? (
          <ParameterLegend
            items={legend ?? []}
            prependSection={showSentimentPolarity ? SENTIMENT_POLARITY_PREPEND_SECTION : undefined}
            title={legendTitle ?? 'Parâmetros'}
            variant={legendVariant}
            className="mt-3"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ChartHeight({ children, tall }: { children: ReactNode; tall?: boolean }) {
  return <div className={cn('w-full', tall ? 'h-[300px]' : 'h-[260px]')}>{children}</div>;
}
