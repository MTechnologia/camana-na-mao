import { useState, useEffect, useRef, useMemo } from "react";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

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

const CapabilitiesOverlay = ({ isOpen, onClose, onSelectCapability }: CapabilitiesOverlayProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      }, 300);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
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
  }, [isOpen, focusedIndex, filteredCapabilities, onSelectCapability]);

  const handleSelect = (message: string) => {
    onSelectCapability(message);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2 relative">
          <DrawerTitle className="text-lg font-semibold text-foreground">
            O que posso fazer por você?
          </DrawerTitle>
          <DrawerClose asChild>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        
        {/* Search */}
        <div className="px-4 pb-3">
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
        <div className="flex-1 overflow-y-auto px-2 pb-4">
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

      </DrawerContent>
    </Drawer>
  );
};

export default CapabilitiesOverlay;
