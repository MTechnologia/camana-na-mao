import { useNavigate } from "react-router-dom";
import { 
  X, 
  Calendar, 
  Users, 
  Building2, 
  BookOpen, 
  GraduationCap, 
  Newspaper,
  BarChart3,
  FileText,
  Shield,
  LogOut,
  Lock,
  User,
  MessageSquare,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrefetch } from "@/components/navigation/PrefetchLink";
import { useCallback } from "react";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDrawer = ({ isOpen, onClose }: MenuDrawerProps) => {
  const navigate = useNavigate();
  const { isAdmin, isGestor, canViewDashboards, canReferToCouncilMember } = useUserRole();
  const { profile, loading: profileLoading, getInitials } = useProfile();
  const { user, signOut } = useAuth();
  const { prefetch } = usePrefetch();

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

  const accountOptions = [
    { 
      id: 1, 
      label: "Meu Perfil", 
      icon: User,
      route: "/perfil"
    },
    { 
      id: 2, 
      label: "Conversas", 
      icon: MessageSquare,
      route: "/conversas"
    },
    ...(canReferToCouncilMember ? [{
      id: 2.5,
      label: "Relatos",
      icon: FileText,
      route: "/relatos",
    }] : []),
    ...(canViewDashboards ? [{
      id: 3,
      label: "Painéis Analíticos",
      icon: BarChart3,
      route: "/paineis",
    }] : []),
  ];


  const menuOptions = [
    { 
      id: 1, 
      label: "Agenda da Câmara", 
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

  const handlePrefetch = useCallback((route: string) => {
    prefetch(route);
  }, [prefetch]);

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
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-background z-50 shadow-2xl transition-transform duration-300 rounded-l-3xl flex flex-col ${
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
          {/* Minha Conta Section */}
          <div className="mb-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Minha Conta
            </h3>
            
            {accountOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleMenuClick(option.route)}
                  onMouseEnter={() => handlePrefetch(option.route)}
                  onFocus={() => handlePrefetch(option.route)}
                  className="w-full py-2.5 flex items-center gap-3 hover:bg-muted transition-colors rounded-lg px-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="text-primary" size={16} />
                  </div>
                  <span className="text-foreground font-medium text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="my-4 border-t border-border" />

          {/* Navegação Institucional */}
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
                  onMouseEnter={() => handlePrefetch(option.route)}
                  onFocus={() => handlePrefetch(option.route)}
                  className="w-full py-2.5 flex items-center gap-3 hover:bg-muted transition-colors rounded-lg px-2"
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
                  onMouseEnter={() => handlePrefetch('/admin')}
                  onFocus={() => handlePrefetch('/admin')}
                  className="w-full py-2.5 flex items-center gap-3 hover:bg-muted transition-colors rounded-lg px-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <Lock className="text-primary" size={16} />
                  </div>
                  <span className="text-foreground font-medium text-sm">Dashboard Admin</span>
                </button>
              </div>
            </>
          )}

        </div>

        {/* Bottom Options - Fixed */}
        <div className="px-4 pb-4 pt-2 space-y-1 border-t border-border shrink-0">
          <button
            onClick={() => {
              navigate('/privacidade');
              onClose();
            }}
            className="w-full py-2.5 flex items-center gap-3 hover:bg-muted transition-colors rounded-lg px-2"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
              <Shield className="text-primary" size={16} />
            </div>
            <span className="text-foreground font-medium text-sm">Política de privacidade</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 flex items-center gap-3 hover:bg-muted transition-colors rounded-lg px-2"
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
