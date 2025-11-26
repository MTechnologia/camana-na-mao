import { MapPin, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface LocationPromptProps {
  onRequestLocation: () => void;
}

const LocationPrompt = ({ onRequestLocation }: LocationPromptProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <Card className="p-4 bg-amber-500/10 border-amber-500/20 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
          <MapPin className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm mb-1">
            Ative sua localização
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Para recomendar serviços próximos e melhorar sua experiência
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onRequestLocation}
              size="sm"
              variant="default"
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Ativar GPS
            </Button>
            <Button
              onClick={() => setIsDismissed(true)}
              size="sm"
              variant="ghost"
            >
              Agora não
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setIsDismissed(true)}
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default LocationPrompt;
