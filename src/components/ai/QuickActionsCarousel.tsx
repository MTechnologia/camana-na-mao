import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Bus, 
  Navigation, 
  Star, 
  Megaphone, 
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
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  action: () => void;
  badge?: number;
}

interface QuickActionsCarouselProps {
  onStartJourney?: (journeyId: string) => void;
}

const QuickActionsCarousel = ({ onStartJourney }: QuickActionsCarouselProps) => {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { pendingRatings } = usePendingRatings();
  const { setJourney } = useAIJourney();

  const handleJourneyClick = (journeyId: string) => {
    const journey = AI_JOURNEYS[journeyId as keyof typeof AI_JOURNEYS];
    if (journey) {
      setJourney(journey);
      onStartJourney?.(journeyId);
    }
  };

  const actions: QuickAction[] = [
    {
      id: "urban_report",
      title: "Relato Urbano",
      icon: MessageSquare,
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
      action: () => handleJourneyClick("urban_report"),
    },
    {
      id: "transport",
      title: "Transporte",
      icon: Bus,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      action: () => handleJourneyClick("transport"),
    },
    {
      id: "services",
      title: "Perto de Você",
      icon: Navigation,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      action: () => navigate("/servicos-proximos"),
    },
    {
      id: "evaluate",
      title: "Avaliar",
      icon: Star,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      action: () => navigate("/avaliar"),
      badge: pendingRatings.length > 0 ? pendingRatings.length : undefined,
    },
    {
      id: "audiencias",
      title: "Audiências",
      icon: Megaphone,
      color: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950/30",
      action: () => navigate("/audiencias"),
    },
    {
      id: "vereadores",
      title: "Vereadores",
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      action: () => navigate("/institucional/vereadores"),
    },
    {
      id: "recommendations",
      title: "Recomendações",
      icon: Sparkles,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      action: () => navigate("/recomendacoes"),
    },
    {
      id: "favorites",
      title: "Favoritos",
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      action: () => navigate("/favoritos"),
      badge: favorites.length > 0 ? favorites.length : undefined,
    },
  ];

  return (
    <div className="px-4 py-2">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.action}
              className="flex-shrink-0 flex flex-col items-center justify-center p-3 w-20 h-20 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 group relative"
            >
              {action.badge && (
                <div className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
                  {action.badge}
                </div>
              )}
              <div className={`w-10 h-10 rounded-lg ${action.bgColor} flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform duration-200`}>
                <IconComponent className={`h-5 w-5 ${action.color}`} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
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
