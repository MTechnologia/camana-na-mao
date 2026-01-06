import { motion } from "framer-motion";
import { 
  Bus, 
  Building2, 
  Star, 
  MapPin, 
  HelpCircle,
  MoreHorizontal 
} from "lucide-react";

export type CollectionTypePreset = 'urban_report' | 'transport_report' | 'service_rating' | null;

interface PromptChip {
  id: string;
  label: string;
  message: string;
  icon: React.ElementType;
  collectionType: CollectionTypePreset;
}

interface PromptChipsProps {
  onSelect: (message: string, collectionType?: CollectionTypePreset) => void;
  onOpenDiscovery?: () => void;
}

const chips: PromptChip[] = [
  {
    id: "urban",
    label: "Problema na cidade",
    message: "Quero relatar um problema na cidade",
    icon: Building2,
    collectionType: "urban_report",
  },
  {
    id: "transport",
    label: "Transporte",
    message: "Quero relatar um problema no transporte público",
    icon: Bus,
    collectionType: "transport_report",
  },
  {
    id: "evaluate",
    label: "Avaliar serviço",
    message: "Quero avaliar um serviço público",
    icon: Star,
    collectionType: "service_rating",
  },
  {
    id: "services",
    label: "Serviços próximos",
    message: "Buscar serviços perto de mim",
    icon: MapPin,
    collectionType: null,
  },
  {
    id: "question",
    label: "Tirar dúvida",
    message: "Tenho uma dúvida sobre a Câmara ou serviços da cidade",
    icon: HelpCircle,
    collectionType: null,
  },
];

const PromptChips = ({ onSelect, onOpenDiscovery }: PromptChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {chips.map((chip, index) => {
        const IconComponent = chip.icon;
        return (
          <motion.button
            key={chip.id}
            onClick={() => onSelect(chip.message, chip.collectionType)}
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border hover:border-primary/30 text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-all duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{chip.label}</span>
          </motion.button>
        );
      })}
      
      {/* Ver todas as opções button */}
      {onOpenDiscovery && (
        <motion.button
          onClick={onOpenDiscovery}
          className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-xs sm:text-sm font-medium text-primary transition-all duration-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: chips.length * 0.04 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Ver mais</span>
        </motion.button>
      )}
    </div>
  );
};

export default PromptChips;
