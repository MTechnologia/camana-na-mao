import { ReactNode, Suspense, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/ui/page-header";
import { useMenu } from "@/contexts/MenuContext";
import { useUserRole } from "@/hooks/useUserRole";
import MenuDrawer from "@/components/MenuDrawer";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";

interface AppLayoutProps {
  children: ReactNode;
}

// Routes that don't need the standard header
const HEADERLESS_ROUTES = [
  "/",
  "/welcome",
  "/login",
  "/register",
  "/reset-password",
  "/onboarding",
  "/voz",
  "/admin",
];

// Route to title mapping
const ROUTE_TITLES: Record<string, string> = {
  // Perfil - PT
  "/perfil": "Meu Perfil",
  "/perfil/dados-pessoais": "Informações Pessoais",
  "/perfil/dados-demograficos": "Dados Demográficos",
  "/perfil/endereco": "Endereço",
  "/perfil/preferencias": "Preferências",
  "/perfil/interesses": "Interesses",
  "/perfil/visitas": "Histórico de visitas",
  "/perfil/inscricoes": "Minhas Inscrições",
  "/perfil/consentimentos": "Consentimentos",
  "/perfil/exportar-dados": "Exportar Dados",
  "/perfil/direitos": "Meus Direitos LGPD",
  // Configurações - PT
  "/configuracoes/acessibilidade": "Acessibilidade",
  // Cidadão - PT
  "/notificacoes": "Notificações",
  "/busca": "Buscar",
  "/conversas": "Conversas",
  "/relatos": "Relatos",
  // Analytics - PT
  "/paineis": "Painéis Analíticos",
  "/paineis/avancado": "Análise Avançada",
  "/paineis/criar": "Criar Painel",
  // Demais rotas
  "/audiencias": "Audiências Públicas",
  "/audiencias/minhas-inscricoes": "Minhas Inscrições",
  "/servicos-proximos": "Serviços Próximos",
  "/servicos/favoritos": "Meus Favoritos",
  "/avaliar": "Avaliar Serviço",
  "/transporte": "Transporte",
  "/transporte/novo": "Novo Relato",
  "/transporte/padroes": "Padrões de Relatos",
  "/relatos/padroes": "Padrões de Relatos",
  "/transporte/historico": "Contribuições de Transporte",
  "/transporte/meus-relatos": "Contribuições de Transporte",
  "/relato-urbano": "Relato Urbano",
  "/relato-urbano/manual": "Novo Relato",
  "/relato-urbano/historico": "Histórico",
  "/institucional/agenda": "Agenda da Câmara",
  "/institucional/vereadores": "Vereadores",
  "/institucional/conheca-camara": "Conheça a Câmara",
  "/institucional/comissoes": "Comissões",
  "/institucional/camara-explica": "Câmara Explica",
  "/institucional/escola-parlamento": "Escola do Parlamento",
  "/institucional/noticias": "Notícias",
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMenuOpen, closeMenu } = useMenu();

  const { isAdmin, isGestor } = useUserRole();
  const isGestorPaineis =
    (isAdmin || isGestor) &&
    location.pathname.startsWith("/paineis") &&
    !location.pathname.startsWith("/paineis/piores-servicos");
  const isAdminRoute = location.pathname.startsWith("/admin") || isGestorPaineis;

  const isHeaderlessRoute = HEADERLESS_ROUTES.some(
    (route) => location.pathname === route || location.pathname.startsWith("/admin"),
  );

  const getTitle = useCallback(() => {
    // Check exact match first
    if (ROUTE_TITLES[location.pathname]) {
      return ROUTE_TITLES[location.pathname];
    }

    // Check for dynamic routes
    const pathParts = location.pathname.split("/");
    if (pathParts[1] === "audiencias" && pathParts[2]) {
      return "Detalhes da Audiência";
    }
    if (pathParts[1] === "servico" && pathParts[2]) {
      return "Detalhes do Serviço";
    }
    if (pathParts[1] === "institucional" && pathParts[2] === "vereadores" && pathParts[3]) {
      return "Vereador";
    }
    if (pathParts[1] === "institucional" && pathParts[2] === "noticias" && pathParts[3]) {
      return "Notícia";
    }
    return "";
  }, [location.pathname]);

  // Admin routes have their own layout - skip AppLayout wrapper but keep Suspense
  if (isAdminRoute) {
    return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
  }

  return (
    <>
      {!isHeaderlessRoute && <PageHeader title={getTitle()} onBack={() => navigate(-1)} />}

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`min-h-screen bg-background ${!isHeaderlessRoute ? "pt-[60px]" : ""}`}
        >
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </motion.div>
      </AnimatePresence>

      <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  );
};

export default AppLayout;
