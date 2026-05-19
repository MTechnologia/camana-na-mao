import { ParameterLegend } from '@/components/admin/analytics/ParameterLegend';
import { SENTIMENT_POLARITY_PREPEND_SECTION } from '@/lib/analyticsParameterLegends';

type SentimentPolarityLegendProps = {
  className?: string;
};

/** Polaridades de sentimento dentro do acordeão Parâmetros. */
export function SentimentPolarityLegend({ className }: SentimentPolarityLegendProps) {
  return (
    <ParameterLegend
      items={[]}
      prependSection={SENTIMENT_POLARITY_PREPEND_SECTION}
      className={className}
    />
  );
}
