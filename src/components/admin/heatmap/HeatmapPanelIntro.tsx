import type { ReactNode } from 'react';
import { ParameterLegend } from '@/components/admin/analytics/ParameterLegend';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';

type HeatmapPanelIntroProps = {
  intro: ReactNode;
  legends: ParameterLegendItem[];
  tooltipTitle: string;
  ariaLabel: string;
};

export function HeatmapPanelIntro({
  intro,
  legends,
  tooltipTitle,
  ariaLabel,
}: HeatmapPanelIntroProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-2xl text-sm text-muted-foreground">{intro}</div>
        <ParameterInfoListTrigger
          items={legends}
          tooltipTitle={tooltipTitle}
          ariaLabel={ariaLabel}
        />
      </div>
      <ParameterLegend
        title="Entendendo o mapa"
        items={legends}
        variant="collapsible"
        className="border-border/80 bg-muted/15"
      />
    </>
  );
}
