import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bus, MapPin, Star, ArrowRight, X, Landmark, MessageCircleMore } from "lucide-react";

interface JourneySuggestionCardProps {
  journeyType: "transport" | "urban_report" | "evaluate" | "general" | "services";
  confidence: "high" | "medium";
  onAccept: () => void;
  onDismiss: () => void;
}

const JOURNEY_CONFIG = {
  general: {
    icon: Landmark,
    title: "Tudo Sobre a Câmara",
    description: "Para dúvidas sobre vereadores, audiências, notícias e funcionamento da Câmara.",
    color: "from-primary to-primary/80",
    bgColor: "bg-primary/5 dark:bg-primary/10",
    borderColor: "border-primary/20 dark:border-primary/30",
  },
  urban_report: {
    icon: MessageCircleMore,
    title: "Fala Cidadão!",
    description: "Registre problemas urbanos, elogios, reclamações ou sugestões para a cidade.",
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  transport: {
    icon: Bus,
    title: "Transporte",
    description: "Registre problemas com ônibus, metrô, trem ou CPTM de forma estruturada.",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  services: {
    icon: MapPin,
    title: "Serviços",
    description: "Encontre UBS, escolas, hospitais e outros serviços públicos próximos a você.",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  evaluate: {
    icon: Star,
    title: "Avaliar",
    description: "Avalie sua experiência em UBS, escolas, hospitais e outros serviços públicos.",
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
};

const JourneySuggestionCard = ({
  journeyType,
  confidence,
  onAccept,
  onDismiss,
}: JourneySuggestionCardProps) => {
  const config = JOURNEY_CONFIG[journeyType];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className={`${config.bgColor} ${config.borderColor} border-2 p-4 relative overflow-hidden`}>
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors"
          aria-label="Dispensar sugestão"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Gradient accent bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${config.color}`} />

        <div className="flex items-start gap-3 pl-2">
          {/* Icon */}
          <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} text-white shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground text-sm">
                {config.title}
              </h4>
              {confidence === "high" && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  Recomendado
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              {config.description}
            </p>

            <Button
              onClick={onAccept}
              size="sm"
              className={`bg-gradient-to-r ${config.color} hover:opacity-90 text-white border-0 h-8 text-xs`}
            >
              Usar esta funcionalidade
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default JourneySuggestionCard;
