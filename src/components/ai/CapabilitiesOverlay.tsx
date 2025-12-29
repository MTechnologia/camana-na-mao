import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bus, 
  Building2, 
  Star, 
  Landmark, 
  MapPin, 
  Calendar, 
  Users, 
  HelpCircle, 
  Newspaper,
  Search,
  X
} from "lucide-react";

interface Capability {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  message: string;
}

interface CapabilityCategory {
  id: string;
  label: string;
  capabilities: Capability[];
}

interface CapabilitiesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCapability: (message: string) => void;
}

const categories: CapabilityCategory[] = [
  {
    id: "registrar",
    label: "REGISTRAR",
    capabilities: [
      {
        id: "transport",
        icon: Bus,
        title: "Problema no transporte",
        description: "Atrasos, lotação, acessibilidade, segurança",
        message: "Quero reclamar de um problema no transporte público",
      },
      {
        id: "urban",
        icon: Building2,
        title: "Problema urbano",
        description: "Buracos, iluminação, lixo, calçadas",
        message: "Quero relatar um problema na minha cidade",
      },
      {
        id: "evaluate",
        icon: Star,
        title: "Avaliar serviço público",
        description: "UBS, escolas, CEUs, hospitais",
        message: "Quero avaliar um serviço público que usei",
      },
      {
        id: "feedback",
        icon: Landmark,
        title: "Feedback sobre vereador",
        description: "Elogios, reclamações ou sugestões",
        message: "Quero dar um feedback sobre um vereador",
      },
    ],
  },
  {
    id: "explorar",
    label: "EXPLORAR",
    capabilities: [
      {
        id: "nearby",
        icon: MapPin,
        title: "Serviços perto de mim",
        description: "UBS, escolas, parques próximos",
        message: "Quais serviços públicos ficam perto de mim?",
      },
      {
        id: "audiencias",
        icon: Calendar,
        title: "Audiências públicas",
        description: "Próximos eventos e como participar",
        message: "Quais audiências públicas estão marcadas?",
      },
      {
        id: "vereadores",
        icon: Users,
        title: "Vereadores da minha região",
        description: "Quem representa você na Câmara",
        message: "Quais vereadores representam minha região?",
      },
    ],
  },
  {
    id: "aprender",
    label: "APRENDER",
    capabilities: [
      {
        id: "duvidas",
        icon: HelpCircle,
        title: "Dúvidas sobre a Câmara",
        description: "Funcionamento, leis, processos",
        message: "Tenho uma dúvida sobre a Câmara Municipal",
      },
      {
        id: "noticias",
        icon: Newspaper,
        title: "Notícias legislativas",
        description: "Últimas novidades da Câmara",
        message: "Quais as últimas notícias da Câmara?",
      },
    ],
  },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1] as const
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.15 }
  }
};

const CapabilitiesOverlay = ({ isOpen, onClose, onSelectCapability }: CapabilitiesOverlayProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten all capabilities for keyboard navigation
  const allCapabilities = useMemo(() => 
    categories.flatMap(cat => cat.capabilities), 
    []
  );

  // Filter capabilities based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    
    const query = searchQuery.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        capabilities: cat.capabilities.filter(
          cap => 
            cap.title.toLowerCase().includes(query) ||
            cap.description.toLowerCase().includes(query)
        )
      }))
      .filter(cat => cat.capabilities.length > 0);
  }, [searchQuery]);

  const filteredCapabilities = useMemo(() => 
    filteredCategories.flatMap(cat => cat.capabilities),
    [filteredCategories]
  );

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setFocusedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < filteredCapabilities.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCapabilities.length - 1
          );
          break;
        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < filteredCapabilities.length) {
            e.preventDefault();
            onSelectCapability(filteredCapabilities[focusedIndex].message);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, filteredCapabilities, onClose, onSelectCapability]);

  const handleSelect = (message: string) => {
    onSelectCapability(message);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-background/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Descubra o que posso fazer"
        >
          <motion.div
            ref={containerRef}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header with search */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">
                  O que posso fazer por você?
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  placeholder="Buscar ação..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Capabilities list */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCategories.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Nenhuma opção encontrada</p>
                  <p className="text-sm mt-1">Tente outro termo de busca</p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} className="mb-4 last:mb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                      {category.label}
                    </h3>
                    
                    <div className="space-y-1">
                      {category.capabilities.map((capability) => {
                        const IconComponent = capability.icon;
                        const globalIndex = filteredCapabilities.findIndex(c => c.id === capability.id);
                        const isFocused = globalIndex === focusedIndex;
                        
                        return (
                          <button
                            key={capability.id}
                            onClick={() => handleSelect(capability.message)}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 ${
                              isFocused 
                                ? "bg-primary/10 border border-primary/30" 
                                : "hover:bg-accent border border-transparent"
                            }`}
                          >
                            <div className={`p-2 rounded-lg shrink-0 ${
                              isFocused ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                            }`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-foreground">
                                {capability.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {capability.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="p-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Use <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono text-[10px]">↑↓</kbd> para navegar • <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono text-[10px]">Enter</kbd> para selecionar • <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono text-[10px]">Esc</kbd> para fechar
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CapabilitiesOverlay;
