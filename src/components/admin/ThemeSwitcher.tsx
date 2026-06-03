import { useMemo } from "react";
import {
  Bus,
  Check,
  ChevronDown,
  Construction,
  GraduationCap,
  HandHeart,
  Heart,
  LayoutDashboard,
  Shield,
  Sparkles,
  Theater,
  Trees,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWidgetTheme } from "@/hooks/useWidgetTheme";
import { WIDGET_THEMES, type WidgetThemeId, getTheme } from "@/lib/widgetThemes";
import { cn } from "@/lib/utils";

/**
 * HU-6.1 — Dropdown global para escolher o tema de atuação do gestor.
 *
 * Posicionado no header de páginas admin (ex.: ReportsAnalyticsPage). Quando
 * o gestor escolhe um tema, o `useWidgetTheme` persiste e o WidgetThemeContext
 * propaga para as tabs filtrarem/destacarem widgets relevantes.
 */

// Map de ícones do catálogo → componente Lucide.
const THEME_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Heart,
  GraduationCap,
  Shield,
  Bus,
  Construction,
  Trees,
  Theater,
  HandHeart,
  Sparkles,
};

interface ThemeSwitcherProps {
  className?: string;
  align?: "start" | "center" | "end";
}

export function ThemeSwitcher({ className, align = "end" }: ThemeSwitcherProps) {
  const { theme, setTheme, isLoading } = useWidgetTheme();

  const current = useMemo(() => getTheme(theme), [theme]);
  const CurrentIcon = THEME_ICONS[current.icon] ?? LayoutDashboard;
  const isCustomTheme = theme !== "geral";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          className={cn("h-9 gap-2", className)}
          aria-label="Escolher tema de atuação"
        >
          <CurrentIcon className={cn("h-4 w-4", isCustomTheme && current.accentClass)} />
          <span className="text-xs font-medium">
            Tema: <span className="font-semibold">{current.shortLabel}</span>
          </span>
          {isCustomTheme && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              Personalizado
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-[min(34rem,calc(100vw-1.5rem))] p-0">
        <DropdownMenuLabel className="px-3 py-2 text-xs text-muted-foreground">
          Personalizar widgets por área
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-2 gap-0.5 p-1" role="presentation">
          {WIDGET_THEMES.map((t) => {
            const Icon = THEME_ICONS[t.icon] ?? LayoutDashboard;
            const isActive = t.id === theme;
            return (
              <DropdownMenuItem
                key={t.id}
                onSelect={() => setTheme(t.id as WidgetThemeId)}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-md py-2.5 pr-2",
                  isActive && "bg-accent",
                )}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", t.accentClass)} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium leading-tight">{t.label}</span>
                    {isActive && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {t.description}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
