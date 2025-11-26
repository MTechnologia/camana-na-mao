import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, MessageSquare, Bus, Star, Calendar, MapPin, Sparkles } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";

interface JourneyHeaderProps {
  journey: JourneyType;
  onClear: () => void;
}

const iconMap = {
  MessageSquare,
  Bus,
  Star,
  Calendar,
  MapPin,
  Sparkles,
};

const JourneyHeader = ({ journey, onClear }: JourneyHeaderProps) => {
  const Icon = iconMap[journey.icon as keyof typeof iconMap] || MessageSquare;

  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-gradient-to-br ${journey.color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-1">
              Modo IA Ativo
            </Badge>
            <h2 className="text-sm font-semibold">{journey.label}</h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default JourneyHeader;
