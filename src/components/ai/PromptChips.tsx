import { motion } from "framer-motion";
import { 
  Bus, 
  Building2, 
  Star, 
  MapPin, 
  HelpCircle,
  MoreHorizontal 
} from "lucide-react";

interface PromptChip {
  id: string;
  label: string;
  message: string;
  icon: React.ElementType;
}

interface PromptChipsProps {
  onSelect: (message: string) => void;
  onOpenDiscovery?: () => void;
}

const chips: PromptChip[] = [
  {
    id: "urban",
    label: "Problema urbano",
    message: "Quero relatar um problema na minha cidade",
    icon: Building2,
  },
  {
    id: "transport",
    label: "Transporte",
    message: "Quero reclamar de um problema no transporte público",
    icon: Bus,
  },
  {
    id: "evaluate",
    label: "Avaliar serviço",
    message: "Quero avaliar um serviço público que usei",
    icon: Star,
  },
  {
    id: "services",
    label: "Serviços próximos",
    message: "Quais serviços públicos ficam perto de mim?",
    icon: MapPin,
  },
  {
    id: "question",
    label: "Tirar dúvida",
    message: "Tenho uma dúvida sobre a Câmara",
    icon: HelpCircle,
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
            onClick={() => onSelect(chip.message)}
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
