import { 
  MessageSquare, 
  Bus, 
  MapPin, 
  Star, 
  Calendar, 
  Users,
  Sparkles,
  Heart
} from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
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
  const { favorites } = useFavorites();
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
      id: "urban_report",
      journeyKey: "urban_report",
      title: "Relato Urbano",
      icon: MessageSquare,
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    },
    {
      id: "transport",
      journeyKey: "transport",
      title: "Transporte",
      icon: Bus,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      id: "services",
      journeyKey: "services",
      title: "Perto de Você",
      icon: MapPin,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
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
    {
      id: "audiencias",
      journeyKey: "audiencias",
      title: "Audiências",
      icon: Calendar,
      color: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950/30",
    },
    {
      id: "vereadores",
      journeyKey: "vereadores",
      title: "Vereadores",
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      id: "recommendations",
      journeyKey: "services",
      title: "Recomendações",
      icon: Sparkles,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      id: "favorites",
      journeyKey: "favorites",
      title: "Favoritos",
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      badge: favorites.length > 0 ? favorites.length : undefined,
    },
  ];

  return (
    <div className="w-full py-2 overflow-visible">
      <div className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 pt-2 scrollbar-hide -mx-4 px-4">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleJourneyClick(action.journeyKey)}
              className="flex-shrink-0 snap-start flex flex-col items-center justify-center p-2 sm:p-3 w-[72px] sm:w-20 h-[72px] sm:h-20 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 group relative"
            >
              {action.badge && (
                <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center z-10">
                  {action.badge}
                </div>
              )}
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${action.bgColor} flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-200`}>
                <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${action.color}`} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground text-center leading-tight line-clamp-2">
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
