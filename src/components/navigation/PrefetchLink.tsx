import { Link, LinkProps } from "react-router-dom";
import { ReactNode, useCallback } from "react";

// Map of routes to their lazy import functions for prefetching
const PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  // Perfil - PT
  "/perfil": () => import("@/pages/Profile"),
  "/notificacoes": () => import("@/pages/Notifications"),
  
  // Citizen pages
  "/audiencias": () => import("@/pages/Audiencias"),
  "/busca": () => import("@/pages/Search"),
  "/conversas": () => import("@/pages/ConversationsPage"),
  "/servicos-proximos": () => import("@/pages/NearbyServicesPage"),
  "/transporte": () => import("@/pages/TransportReportPage"),
  "/transporte/ao-vivo": () => import("@/pages/transport/LiveBusPage"),
  "/relato-urbano": () => import("@/pages/UrbanReportPage"),
  "/relatos": () => import("@/pages/reports/ReportsHub"),
  "/avaliacao": () => import("@/pages/EvaluationPage"),
  
  // Analytics - PT
  "/paineis": () => import("@/pages/analytics/AnalyticsDashboard"),
  "/paineis/avancado": () => import("@/pages/analytics/AdvancedAnalytics"),
  "/paineis/criar": () => import("@/pages/analytics/CreateDashboard"),
  
  // Settings - PT
  "/configuracoes/acessibilidade": () => import("@/pages/settings/AccessibilityPage"),
  
  // Institutional pages
  "/institucional/agenda": () => import("@/pages/institucional/AgendaCMSP"),
  "/institucional/vereadores": () => import("@/pages/institucional/Vereadores"),
  "/institucional/conheca-camara": () => import("@/pages/institucional/ConhecaCamara"),
  "/institucional/comissoes": () => import("@/pages/institucional/Comissoes"),
  "/institucional/camara-explica": () => import("@/pages/institucional/CamaraExplica"),
  "/institucional/escola-parlamento": () => import("@/pages/institucional/EscolaParlamento"),
  "/institucional/noticias": () => import("@/pages/institucional/Noticias"),
  
  // Admin pages
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/users": () => import("@/pages/admin/UserManagement"),
  "/admin/reports": () => import("@/pages/admin/ReportsManagement"),
};

interface PrefetchLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
  children: ReactNode;
  prefetch?: boolean;
}

export const PrefetchLink = ({ 
  to, 
  children, 
  prefetch = true,
  onMouseEnter,
  onFocus,
  ...props 
}: PrefetchLinkProps) => {
  const handlePrefetch = useCallback(() => {
    if (!prefetch) return;
    
    const prefetchFn = PREFETCH_MAP[to];
    if (prefetchFn) {
      // Prefetch the module
      prefetchFn().catch(() => {
        // Silently fail - not critical if prefetch fails
      });
    }
  }, [to, prefetch]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    handlePrefetch();
    onMouseEnter?.(e);
  }, [handlePrefetch, onMouseEnter]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLAnchorElement>) => {
    handlePrefetch();
    onFocus?.(e);
  }, [handlePrefetch, onFocus]);

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </Link>
  );
};

// Hook for programmatic prefetching
// eslint-disable-next-line react-refresh/only-export-components -- PrefetchLink + usePrefetch pattern
export const usePrefetch = () => {
  const prefetch = useCallback((route: string) => {
    const prefetchFn = PREFETCH_MAP[route];
    if (prefetchFn) {
      prefetchFn().catch(() => {});
    }
  }, []);

  const prefetchMultiple = useCallback((routes: string[]) => {
    routes.forEach(route => {
      const prefetchFn = PREFETCH_MAP[route];
      if (prefetchFn) {
        prefetchFn().catch(() => {});
      }
    });
  }, []);

  return { prefetch, prefetchMultiple };
};
