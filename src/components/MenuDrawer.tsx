import { useNavigate } from "react-router-dom";
import { 
  X, 
  Calendar, 
  Users, 
  Building2, 
  BookOpen, 
  GraduationCap, 
  Newspaper,
  Settings,
  Phone,
  Shield,
  LogOut
} from "lucide-react";
import avatarLuana from "@/assets/avatar-luana.jpg";
import { useAccessibility } from "@/hooks/useAccessibility";
import { Switch } from "@/components/ui/switch";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDrawer = ({ isOpen, onClose }: MenuDrawerProps) => {
  const navigate = useNavigate();
  const {
    fontSize,
    readingMode,
    textSpacing,
    setFontSize,
    toggleReadingMode,
    toggleTextSpacing,
  } = useAccessibility();

  const menuOptions = [
    { 
      id: 1, 
      label: "Agenda CMSP", 
      icon: Calendar,
      route: "/institucional/agenda"
    },
    { 
      id: 2, 
      label: "Vereadores", 
      icon: Users,
      route: "/institucional/vereadores"
    },
    { 
      id: 3, 
      label: "Conheça a Câmara", 
      icon: Building2,
      route: "/institucional/conheca-camara"
    },
    { 
      id: 4, 
      label: "Câmara Explica", 
      icon: BookOpen,
      route: "/institucional/camara-explica"
    },
    { 
      id: 5, 
      label: "Escola do Parlamento", 
      icon: GraduationCap,
      route: "/institucional/escola-parlamento"
    },
    { 
      id: 6, 
      label: "Notícias", 
      icon: Newspaper,
      route: "/institucional/noticias"
    },
  ];

  const bottomOptions = [
    { 
      id: 1, 
      label: "Configurações",
      icon: Settings,
      route: "/profile/preferences"
    },
    { 
      id: 2, 
      label: "Central de Atendimento",
      icon: Phone
    },
    { 
      id: 3, 
      label: "Política de privacidade",
      icon: Shield
    },
  ];

  const handleMenuClick = (route?: string) => {
    onClose();
    if (route) {
      navigate(route);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 shadow-2xl transition-transform duration-300 rounded-l-3xl flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border shrink-0">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-foreground hover:text-foreground/70"
            aria-label="Fechar menu"
          >
            <X size={28} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-4">
            <img 
              src={avatarLuana} 
              alt="Luana Oliveira" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h2 className="font-bold text-lg text-foreground">Luana Oliveira</h2>
              <p className="text-sm text-foreground/70">Olá, seja bem vinda</p>
            </div>
          </div>
        </div>

        {/* Menu Items - Scrollable */}
        <div className="flex-1 overflow-y-auto py-6 px-6">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Navegação Institucional
            </h3>
            
            {menuOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleMenuClick(option.route)}
                  className="w-full py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="text-primary" size={20} />
                  </div>
                  <span className="text-foreground font-medium text-base">{option.label}</span>
                </button>
              );
            })}
          </div>

          {/* Accessibility Section */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-foreground font-semibold text-base mb-4 flex items-center gap-2">
              ♿ Acessibilidade
            </h3>
            
            {/* Font Size */}
            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">
                Tamanho da fonte
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFontSize("small")}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    fontSize === "small"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                  aria-label="Fonte pequena"
                >
                  <span className="text-sm">A</span>
                </button>
                <button
                  onClick={() => setFontSize("medium")}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    fontSize === "medium"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                  aria-label="Fonte média"
                >
                  <span className="text-base">A</span>
                </button>
                <button
                  onClick={() => setFontSize("large")}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    fontSize === "large"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                  aria-label="Fonte grande"
                >
                  <span className="text-lg">A</span>
                </button>
              </div>
            </div>

            {/* Reading Mode */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📖</span>
                <span className="text-foreground font-medium">Modo Leitura</span>
              </div>
              <Switch
                checked={readingMode}
                onCheckedChange={toggleReadingMode}
                aria-label="Ativar modo leitura"
              />
            </div>

            {/* Text Spacing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">↔️</span>
                <span className="text-foreground font-medium">Espaçamento</span>
              </div>
              <Switch
                checked={textSpacing}
                onCheckedChange={toggleTextSpacing}
                aria-label="Aumentar espaçamento"
              />
            </div>
          </div>
        </div>

        {/* Bottom Options - Fixed */}
        <div className="px-6 pb-8 pt-4 space-y-3 border-t border-border shrink-0">
          {bottomOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleMenuClick(option.route)}
                className="w-full text-left py-2 text-muted-foreground hover:text-foreground transition-colors text-base flex items-center gap-3"
              >
                <Icon size={18} />
                <span>{option.label}</span>
              </button>
            );
          })}
          
          <button className="w-full text-left py-2 text-foreground font-semibold hover:text-primary transition-colors text-base flex items-center gap-3">
            <LogOut size={18} />
            <span>Sair do App Câmara SP</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MenuDrawer;
