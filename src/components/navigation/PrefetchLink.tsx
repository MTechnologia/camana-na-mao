import { Link, LinkProps } from "react-router-dom";
import { ReactNode, useCallback } from "react";

// Map of routes to their lazy import functions for prefetching
const PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  "/profile": () => import("@/pages/Profile"),
  "/notifications": () => import("@/pages/Notifications"),
  "/audiencias": () => import("@/pages/Audiencias"),
  "/search": () => import("@/pages/Search"),
  "/favoritos": () => import("@/pages/FavoritesPage"),
  "/conversas": () => import("@/pages/ConversationsPage"),
  "/servicos-proximos": () => import("@/pages/NearbyServicesPage"),
  "/transporte": () => import("@/pages/TransportReportPage"),
  "/relato-urbano": () => import("@/pages/UrbanReportPage"),
  "/analytics": () => import("@/pages/analytics/AnalyticsDashboard"),
  "/institucional/agenda": () => import("@/pages/institucional/AgendaCMSP"),
  "/institucional/vereadores": () => import("@/pages/institucional/Vereadores"),
  "/institucional/conheca-camara": () => import("@/pages/institucional/ConhecaCamara"),
  "/institucional/camara-explica": () => import("@/pages/institucional/CamaraExplica"),
  "/institucional/escola-parlamento": () => import("@/pages/institucional/EscolaParlamento"),
  "/institucional/noticias": () => import("@/pages/institucional/Noticias"),
  "/settings/accessibility": () => import("@/pages/settings/AccessibilityPage"),
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
