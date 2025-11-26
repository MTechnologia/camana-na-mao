import { X, Navigation, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { DirectionsResult } from '@/hooks/useMapboxDirections';
import { formatDistance, formatDuration, translateManeuver, getManeuverIcon, buildGoogleMapsUrl, buildWazeUrl } from '@/lib/mapUtils';

interface DirectionsDrawerProps {
  open: boolean;
  onClose: () => void;
  directions: DirectionsResult | null;
  serviceName: string;
  serviceAddress: string;
  origin: [number, number];
  destination: [number, number];
  onModeChange: (mode: 'walking' | 'driving' | 'cycling') => void;
  currentMode: 'walking' | 'driving' | 'cycling';
}

const modeIcons = {
  walking: '🚶',
  driving: '🚗',
  cycling: '🚴',
};

const modeLabels = {
  walking: 'A pé',
  driving: 'Carro',
  cycling: 'Bike',
};

export const DirectionsDrawer = ({
  open,
  onClose,
  directions,
  serviceName,
  serviceAddress,
  origin,
  destination,
  onModeChange,
  currentMode,
}: DirectionsDrawerProps) => {
  const handleOpenGoogleMaps = () => {
    const url = buildGoogleMapsUrl(origin[1], origin[0], destination[1], destination[0]);
    window.open(url, '_blank');
  };

  const handleOpenWaze = () => {
    const url = buildWazeUrl(destination[1], destination[0]);
    window.open(url, '_blank');
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DrawerTitle className="text-left">Como chegar</DrawerTitle>
              <div className="mt-2">
                <p className="text-sm font-semibold text-foreground">{serviceName}</p>
                <p className="text-xs text-muted-foreground">{serviceAddress}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto">
          {/* Transport Mode Selector */}
          <div className="flex gap-2 mb-4">
            {(['walking', 'driving', 'cycling'] as const).map((mode) => (
              <Button
                key={mode}
                variant={currentMode === mode ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => onModeChange(mode)}
              >
                <span className="mr-1">{modeIcons[mode]}</span>
                {modeLabels[mode]}
              </Button>
            ))}
          </div>

          {directions && (
            <>
              {/* Summary */}
              <Card className="p-3 mb-4 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-around text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatDuration(directions.duration)}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground">Distância</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatDistance(directions.distance)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Navigation Steps */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Instruções de navegação
                </h3>
                <div className="space-y-3">
                  {directions.steps.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                        {getManeuverIcon(step.maneuver)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          {step.instruction || translateManeuver(step.maneuver)}
                        </p>
                        {step.distance > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistance(step.distance)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* External Apps */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleOpenGoogleMaps}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Abrir no Google Maps
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleOpenWaze}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Abrir no Waze
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
