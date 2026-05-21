import { Label } from '@/components/ui/label';
import { ParameterInfoTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';

type HeatmapFilterLabelProps = {
  htmlFor: string;
  legend: ParameterLegendItem;
  /** Rótulo visível; padrão = legend.term */
  label?: string;
};

export function HeatmapFilterLabel({ htmlFor, legend, label }: HeatmapFilterLabelProps) {
  const text = label ?? legend.term;
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{text}</Label>
      <ParameterInfoTrigger item={legend} />
    </div>
  );
}
