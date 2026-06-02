import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { MapPin } from "lucide-react";
import {
  NEARBY_RADIUS_PRESETS,
  clampNearbyRadiusMeters,
  nearbyBandHint,
} from "@/lib/nearbyRadiusBands";

interface RadiusSelectorProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  /** Se true, explica faixa em anel (0–500 m, 501 m–1 km, …) */
  showBandHint?: boolean;
}

export const RadiusSelector = ({ radius, onRadiusChange, showBandHint }: RadiusSelectorProps) => {
  const safeRadius = clampNearbyRadiusMeters(radius);
  const presetIndex = Math.max(
    0,
    NEARBY_RADIUS_PRESETS.indexOf(safeRadius as (typeof NEARBY_RADIUS_PRESETS)[number]),
  );

  const formatRadius = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(0)}km`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Raio de busca: {formatRadius(safeRadius)}
          </span>
        </div>

        <Slider
          value={[presetIndex]}
          onValueChange={([value]) => {
            const idx = Math.min(Math.max(0, value), NEARBY_RADIUS_PRESETS.length - 1);
            onRadiusChange(NEARBY_RADIUS_PRESETS[idx]);
          }}
          min={0}
          max={NEARBY_RADIUS_PRESETS.length - 1}
          step={1}
          className="mb-3"
        />

        <div className="flex flex-wrap gap-2">
          {NEARBY_RADIUS_PRESETS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRadiusChange(option)}
              className={`
                flex-1 min-w-[4.5rem] px-3 py-1.5 text-xs rounded-md transition-colors
                ${
                  safeRadius === option
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }
              `}
            >
              {formatRadius(option)}
            </button>
          ))}
        </div>

        {showBandHint && (
          <p className="mt-3 text-xs text-muted-foreground leading-snug">
            {nearbyBandHint(safeRadius)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
