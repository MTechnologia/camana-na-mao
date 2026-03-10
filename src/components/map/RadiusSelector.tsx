import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { MapPin } from "lucide-react";

interface RadiusSelectorProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const radiusOptions = [
  { value: 2000, label: "2km" },
  { value: 1000, label: "1km" },
  { value: 5000, label: "5km" },
  { value: 10000, label: "10km" },
  { value: 500, label: "500m" },
];

export const RadiusSelector = ({ radius, onRadiusChange }: RadiusSelectorProps) => {
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
            Raio de busca: {formatRadius(radius)}
          </span>
        </div>
        
        <Slider
          value={[radius]}
          onValueChange={([value]) => onRadiusChange(value)}
          min={500}
          max={10000}
          step={500}
          className="mb-3"
        />
        
        <div className="flex gap-2">
          {radiusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onRadiusChange(option.value)}
              className={`
                flex-1 px-3 py-1.5 text-xs rounded-md transition-colors
                ${radius === option.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
