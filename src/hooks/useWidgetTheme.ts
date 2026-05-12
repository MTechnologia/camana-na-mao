/**
 * HU-6.1 — Hook de preferência de tema de atuação.
 *
 * Movido para um Context Provider em `src/contexts/WidgetThemeContext.tsx`
 * porque cada consumidor (ThemeSwitcher, ReportsAnalyticsPage) precisava
 * compartilhar o mesmo state — sem Context, mudanças no Switcher só
 * refletiam no resto da página após refresh.
 *
 * Este arquivo permanece apenas como re-export para preservar os imports
 * existentes (`@/hooks/useWidgetTheme`).
 */
export {
  useWidgetTheme,
  WidgetThemeProvider,
  type UseWidgetThemeResult,
} from "@/contexts/WidgetThemeContext";
