import { Card } from '@/components/ui/card';

interface ServiceMarkerProps {
  name: string;
  serviceType: string;
  distance?: number;
  onClick: () => void;
}

const serviceIcons: Record<string, string> = {
  ubs: "🏥",
  school: "🏫",
  ceu: "🎭",
  hospital: "🏥",
  library: "📚",
  sports_center: "⚽",
  other: "📍"
};

const formatDistance = (meters?: number) => {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export const ServiceMarker = ({ name, serviceType, distance, onClick }: ServiceMarkerProps) => {
  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <div className="w-8 h-8 bg-background rounded-full shadow-lg flex items-center justify-center text-lg border-2 border-primary group-hover:scale-110 transition-transform">
        {serviceIcons[serviceType] || serviceIcons.other}
      </div>
      
      <Card className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 min-w-[150px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
        <p className="text-xs font-semibold text-foreground line-clamp-2">
          {name}
        </p>
        {distance && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistance(distance)}
          </p>
        )}
      </Card>
    </div>
  );
};
