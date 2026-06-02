import type { ReactNode } from "react";
import { AnalyticsFiltersProvider } from "@/contexts/AnalyticsFiltersContext";
import { WidgetThemeProvider } from "@/contexts/WidgetThemeContext";

/**
 * Providers compartilhados das rotas admin.
 * Devem envolver o corpo das páginas (antes de AdminLayout), pois hooks como
 * useWidgetTheme() e useGlobalFilters() rodam no início do componente da página.
 */
export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <WidgetThemeProvider>
      <AnalyticsFiltersProvider>{children}</AnalyticsFiltersProvider>
    </WidgetThemeProvider>
  );
}
