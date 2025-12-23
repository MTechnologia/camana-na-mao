import { ReactNode, Suspense, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/ui/page-header";
import { useMenu } from "@/contexts/MenuContext";
import MenuDrawer from "@/components/MenuDrawer";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";
import BuildStamp from "@/components/debug/BuildStamp";

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
  "/profile": "Meu Perfil",
  "/profile/personal": "Informações Pessoais",
  "/profile/demographics": "Dados Demográficos",
  "/profile/address": "Endereço",
  "/profile/preferences": "Preferências",
  "/profile/interests": "Interesses",
  "/notifications": "Notificações",
  "/audiencias": "Audiências Públicas",
  "/search": "Buscar",
  "/favoritos": "Favoritos",
  "/conversas": "Conversas",
  "/servicos-proximos": "Serviços Próximos",
  "/avaliar": "Avaliar Serviço",
  "/transporte": "Transporte",
  "/transporte/novo": "Novo Relato",
  "/transporte/urgente": "Relato Urgente",
  "/transporte/padroes": "Padrões de Relatos",
  "/transporte/meus-relatos": "Meus Relatos",
  "/relato-urbano": "Relato Urbano",
  "/relato-urbano/manual": "Novo Relato",
  "/relato-urbano/historico": "Histórico",
  "/analytics": "Analytics",
  "/analytics/advanced": "Análise Avançada",
  "/analytics/criar-painel": "Criar Painel",
  "/analytics/galeria": "Galeria de Painéis",
  "/institucional/agenda": "Agenda da Câmara",
  "/institucional/vereadores": "Vereadores",
  "/institucional/conheca-camara": "Conheça a Câmara",
  "/institucional/camara-explica": "Câmara Explica",
  "/institucional/escola-parlamento": "Escola do Parlamento",
  "/institucional/noticias": "Notícias",
  "/settings/accessibility": "Acessibilidade",
  "/recomendacoes": "Recomendações",
  "/docs/overview": "Documentação",
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMenuOpen, closeMenu } = useMenu();

  const isHeaderlessRoute = HEADERLESS_ROUTES.some(
    (route) => location.pathname === route || location.pathname.startsWith("/admin")
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
    if (pathParts[1] === "transporte" && pathParts[2] === "encaminhar") {
      return "Encaminhar Relato";
    }
    
    return "";
  }, [location.pathname]);

  return (
    <>
      {!isHeaderlessRoute && (
        <PageHeader 
          title={getTitle()} 
          onBack={() => navigate(-1)}
        />
      )}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`min-h-screen bg-background ${!isHeaderlessRoute ? "pt-[60px]" : ""}`}
        >
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </motion.div>
      </AnimatePresence>
      
      <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} />
      
      {/* Debug: Build timestamp indicator */}
      <BuildStamp />
    </>
  );
};

export default AppLayout;
