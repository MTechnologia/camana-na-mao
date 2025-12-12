import { 
  Landmark,
  MessageCircleMore, 
  Bus, 
  MapPin, 
  Star
} from "lucide-react";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { AI_JOURNEYS } from "@/config/aiJourneys";

interface QuickAction {
  id: string;
  journeyKey: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badge?: number;
}

interface QuickActionsCarouselProps {
  onStartJourney?: (journeyId: string) => void;
}

const QuickActionsCarousel = ({ onStartJourney }: QuickActionsCarouselProps) => {
  const { pendingRatings } = usePendingRatings();
  const { setJourney } = useAIJourney();

  const handleJourneyClick = (journeyKey: string) => {
    const journey = AI_JOURNEYS[journeyKey];
    if (journey) {
      setJourney(journey);
      onStartJourney?.(journeyKey);
    }
  };

  const actions: QuickAction[] = [
    {
      id: "general",
      journeyKey: "general",
      title: "Tudo Sobre a Câmara",
      icon: Landmark,
      color: "text-primary",
      bgColor: "bg-primary/10 dark:bg-primary/20",
    },
    {
      id: "urban_report",
      journeyKey: "urban_report",
      title: "Fala Cidadão!",
      icon: MessageCircleMore,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      id: "transport",
      journeyKey: "transport",
      title: "Transporte",
      icon: Bus,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      id: "services",
      journeyKey: "services",
      title: "Serviços",
      icon: MapPin,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      id: "evaluate",
      journeyKey: "evaluate",
      title: "Avaliar",
      icon: Star,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      badge: pendingRatings.length > 0 ? pendingRatings.length : undefined,
    },
  ];

  return (
    <div className="w-full py-2 overflow-hidden">
      <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-hide px-1 pr-8">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleJourneyClick(action.journeyKey)}
              className="flex-shrink-0 flex flex-col items-center justify-center p-2.5 w-[72px] h-[90px] bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 group relative"
              aria-label={action.title}
            >
              {action.badge && (
                <div className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
                  {action.badge}
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform duration-200`}>
                <IconComponent className={`h-5 w-5 ${action.color}`} />
              </div>
              <span className="text-[10px] font-medium text-foreground text-center leading-tight max-w-full">
                {action.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsCarousel;
