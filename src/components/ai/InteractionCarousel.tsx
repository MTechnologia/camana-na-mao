import { MessageCircle, Calendar, Search, Star, Bus, MessageSquare, MapPin, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { AI_JOURNEYS } from "@/config/aiJourneys";

interface InteractionCarouselProps {
  onSelect: (action: string) => void;
}

const InteractionCarousel = ({ onSelect }: InteractionCarouselProps) => {
  const iconMap = {
    MessageSquare,
    Bus,
    Star,
    Calendar,
    MapPin,
    Sparkles,
  };

  const cards = Object.values(AI_JOURNEYS).map(journey => ({
    id: journey.id,
    icon: iconMap[journey.icon as keyof typeof iconMap] || MessageSquare,
    label: journey.label,
    description: journey.initialMessage || "",
    color: journey.color,
  }));

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-4 px-1">
        O que você gostaria?
      </h3>
      
      <div className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 scrollbar-hide -mx-6 px-6 pt-2">
        {cards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-[280px] md:w-[320px]"
            >
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 overflow-hidden"
                onClick={() => onSelect(card.id)}
              >
                <CardContent className="p-0">
                  <div className={`h-full bg-gradient-to-br ${card.color} p-6 text-white`}>
                    <div className="flex flex-col h-full min-h-[160px]">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-7 h-7" />
                      </div>
                      <h4 className="font-semibold text-base mb-2 leading-tight">
                        {card.label}
                      </h4>
                      <p className="text-sm text-white/80 leading-snug">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default InteractionCarousel;
