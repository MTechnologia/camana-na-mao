import type { ReactNode } from 'react';
import { ChartParametersHelp } from '@/components/admin/analytics/ChartParametersHelp';
import { Card, CardContent } from '@/components/ui/card';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import type { ParameterLegendSection } from '@/components/admin/analytics/ParameterLegend';
import { SENTIMENT_POLARITY_PREPEND_SECTION } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

export function ChartCard({
  title,
  subtitle,
  legend,
  legendTitle,
  showSentimentPolarity = false,
  children,
  className,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  legend?: ParameterLegendItem[];
  legendTitle?: string;
  showSentimentPolarity?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const hasLegend = (legend?.length ?? 0) > 0 || showSentimentPolarity;

  return (
    <Card className={className}>
      <CardContent className={cn('relative p-4', contentClassName)}>
        {hasLegend ? (
          <ChartParametersHelp
            className="absolute right-3 top-3 z-10"
            items={legend ?? []}
            prependSection={showSentimentPolarity ? SENTIMENT_POLARITY_PREPEND_SECTION : undefined}
            title={legendTitle ?? 'Parâmetros'}
            chartTitle={title}
          />
        ) : null}

        <div className={cn('mb-3 min-w-0', hasLegend && 'pr-9')}>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>

        {children}
      </CardContent>
    </Card>
  );
}

export function ChartHeight({ children, tall }: { children: ReactNode; tall?: boolean }) {
  return <div className={cn('w-full', tall ? 'h-[300px]' : 'h-[260px]')}>{children}</div>;
}
