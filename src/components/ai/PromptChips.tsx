import { motion } from "framer-motion";
import {
  Bus,
  Building2,
  Star,
  MapPin,
  HelpCircle,
  Landmark,
  LayoutList,
  Calendar,
  CalendarCheck,
  Newspaper,
  ChevronDown,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
    label: "Relato na cidade",
    message:
      "Quero falar sobre a cidade — pode ser reclamação, dúvida, sugestão ou elogio",
    icon: Building2,
    collectionType: "urban_report",
  },
  {
    id: "manual_report",
    label: "Formulário manual (com foto)",
    message: "[OPEN_MANUAL_REPORT]",
    icon: FileText,
    collectionType: null,
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
    id: "estrutura",
    label: "Conhecer a Câmara",
    message: "Quero conhecer a estrutura e o funcionamento da Câmara Municipal",
    icon: Landmark,
    collectionType: null,
  },
  {
    id: "audiencias",
    label: "Audiências públicas",
    message: "Mostre as audiências públicas agendadas",
    icon: CalendarCheck,
    collectionType: null,
  },
  {
    id: "comissoes",
    label: "Comissões e atribuições",
    message: "Quais são as comissões da Câmara e o que cada uma faz?",
    icon: LayoutList,
    collectionType: null,
  },
  {
    id: "agenda",
    label: "Ver agenda",
    message: "Quais são as próximas atividades da Câmara? O que tem na agenda?",
    icon: Calendar,
    collectionType: null,
  },
  {
    id: "noticias",
    label: "Ver notícias",
    message: "Quais as últimas notícias da Câmara?",
    icon: Newspaper,
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

/** IDs dos chips principais exibidos sempre; o restante fica no dropdown "Ver todos" */
const PRIMARY_CHIP_IDS = ["urban", "manual_report", "evaluate", "services", "audiencias", "estrutura"];

const PromptChips = ({ onSelect, onOpenDiscovery }: PromptChipsProps) => {
  const primaryChips = chips.filter((c) => PRIMARY_CHIP_IDS.includes(c.id));
  const otherChips = chips.filter((c) => !PRIMARY_CHIP_IDS.includes(c.id));

  const renderChip = (chip: PromptChip, index: number) => {
    const IconComponent = chip.icon;
    return (
      <motion.button
        key={chip.id}
        onClick={() => onSelect(chip.message, chip.collectionType)}
        className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border hover:border-primary/30 text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-all duration-200 flex-shrink-0 min-w-fit"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="whitespace-nowrap">{chip.label}</span>
      </motion.button>
    );
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-full overflow-hidden">
      {primaryChips.map((chip, index) => renderChip(chip, index))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-xs sm:text-sm font-medium text-primary h-auto"
          >
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">Ver todos</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[min(70vh,320px)] overflow-y-auto">
          {otherChips.map((chip) => {
            const IconComponent = chip.icon;
            return (
              <DropdownMenuItem
                key={chip.id}
                onClick={() => onSelect(chip.message, chip.collectionType)}
                className="gap-2 cursor-pointer"
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span>{chip.label}</span>
              </DropdownMenuItem>
            );
          })}
          {onOpenDiscovery && (
            <DropdownMenuItem onClick={onOpenDiscovery} className="gap-2 cursor-pointer border-t mt-1 pt-1">
              <span className="text-primary font-medium">Explorar mais opções</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default PromptChips;
