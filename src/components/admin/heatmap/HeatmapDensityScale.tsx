import { HeatmapVisualScale } from '@/components/admin/heatmap/HeatmapVisualScale';

type HeatmapDensityScaleProps = {
  className?: string;
};

/** @deprecated Prefer HeatmapVisualScale variant="density" */
export function HeatmapDensityScale({ className }: HeatmapDensityScaleProps) {
  return <HeatmapVisualScale variant="density" className={className} />;
}
