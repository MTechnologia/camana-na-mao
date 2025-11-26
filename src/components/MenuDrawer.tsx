import { useState } from "react";
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
  Shield,
  LogOut,
  Lock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAccessibility } from "@/hooks/useAccessibility";
import { Switch } from "@/components/ui/switch";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDrawer = ({ isOpen, onClose }: MenuDrawerProps) => {
  const navigate = useNavigate();
  const { isAdmin, isGestor, loading } = useUserRole();
  const { profile, loading: profileLoading, getInitials } = useProfile();
  const { user, signOut } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);
  const {
    fontSize,
    readingMode,
    textSpacing,
    setFontSize,
    toggleReadingMode,
    toggleTextSpacing,
  } = useAccessibility();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
      onClose();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

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
        <div className="p-4 pb-3 border-b border-border shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-foreground hover:text-foreground/70"
            aria-label="Fechar menu"
          >
            <X size={24} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-3">
            {profileLoading ? (
              <>
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </>
            ) : (
              <>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.full_name ? getInitials(profile.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-base text-foreground">
                    {profile?.full_name || user?.email || "Visitante"}
                  </h2>
                  <p className="text-xs text-muted-foreground">{getGreeting()}!</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Menu Items - Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          <div className="mb-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Navegação Institucional
            </h3>
            
            {menuOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleMenuClick(option.route)}
                  className="w-full py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg px-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="text-primary" size={16} />
                  </div>
                  <span className="text-foreground font-medium text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>

          {/* Admin Area */}
          {(isAdmin || isGestor) && (
            <>
              <div className="my-4 border-t border-border" />
              <div className="mb-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  Área Administrativa
                </h3>
                <button
                  onClick={() => handleMenuClick('/admin')}
                  className="w-full py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg px-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <Lock className="text-primary" size={16} />
                  </div>
                  <span className="text-foreground font-medium text-sm">Dashboard Admin</span>
                </button>
              </div>
            </>
          )}

          <div className="my-4 border-t border-border" />

          {/* Configurações com Acessibilidade */}
          <div className="mb-4">
            <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg px-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <Settings className="text-primary" size={16} />
                  </div>
                  <span className="text-foreground font-medium text-sm flex-1 text-left">Configurações</span>
                  {configOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2 ml-10 space-y-3 border-l-2 border-border pl-3">
                {/* Acessibilidade */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Acessibilidade
                  </h4>

                  {/* Tamanho da fonte */}
                  <div>
                    <p className="text-xs font-medium mb-2 text-foreground">Tamanho da fonte</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setFontSize("small")}
                        className={`flex-1 py-2 px-2 rounded-lg border-2 transition-colors ${
                          fontSize === "small"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="text-xs">A</span>
                      </button>
                      <button
                        onClick={() => setFontSize("medium")}
                        className={`flex-1 py-2 px-2 rounded-lg border-2 transition-colors ${
                          fontSize === "medium"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="text-sm">A</span>
                      </button>
                      <button
                        onClick={() => setFontSize("large")}
                        className={`flex-1 py-2 px-2 rounded-lg border-2 transition-colors ${
                          fontSize === "large"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="text-base">A</span>
                      </button>
                    </div>
                  </div>

                  {/* Modo de leitura */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📖</span>
                      <span className="text-xs font-medium">Modo Leitura</span>
                    </div>
                    <Switch checked={readingMode} onCheckedChange={toggleReadingMode} />
                  </div>

                  {/* Espaçamento de texto */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">↔️</span>
                      <span className="text-xs font-medium">Espaçamento</span>
                    </div>
                    <Switch checked={textSpacing} onCheckedChange={toggleTextSpacing} />
                  </div>
                </div>

                {/* Link para preferências */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => handleMenuClick('/profile/preferences')}
                >
                  Ver todas as preferências
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Bottom Options - Fixed */}
        <div className="px-4 pb-6 pt-3 space-y-2 border-t border-border shrink-0">
          {bottomOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={onClose}
                className="w-full py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg px-2"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <Icon className="text-primary" size={16} />
                </div>
                <span className="text-foreground font-medium text-sm">{option.label}</span>
              </button>
            );
          })}
          
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg px-2"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
              <LogOut className="text-primary" size={16} />
            </div>
            <span className="text-foreground font-medium text-sm">Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MenuDrawer;
