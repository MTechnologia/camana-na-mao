import { motion } from "framer-motion";
import { MessageCircle, HelpCircle, MapPin } from "lucide-react";

interface PromptChip {
  id: string;
  label: string;
  message: string;
  icon: React.ElementType;
}

interface PromptChipsProps {
  onSelect: (message: string) => void;
}

const chips: PromptChip[] = [
  {
    id: "report",
    label: "Relatar problema",
    message: "Quero registrar um problema na minha cidade",
    icon: MessageCircle,
  },
  {
    id: "question",
    label: "Tirar dúvida",
    message: "Tenho uma dúvida sobre a Câmara",
    icon: HelpCircle,
  },
  {
    id: "services",
    label: "Serviços próximos",
    message: "Quais serviços públicos ficam perto de mim?",
    icon: MapPin,
  },
];

const PromptChips = ({ onSelect }: PromptChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {chips.map((chip, index) => {
        const IconComponent = chip.icon;
        return (
          <motion.button
            key={chip.id}
            onClick={() => onSelect(chip.message)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border hover:border-primary/30 text-sm font-medium text-foreground hover:text-primary transition-all duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <IconComponent className="w-4 h-4" />
            <span>{chip.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default PromptChips;
