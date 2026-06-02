import { useState } from "react";
import { Bookmark, ChevronDown, Plus, Settings2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardPresets } from "@/hooks/useDashboardPresets";
import { useWidgetTheme } from "@/hooks/useWidgetTheme";
import { getTheme } from "@/lib/widgetThemes";
import { cn } from "@/lib/utils";
import { SavePresetDialog } from "@/components/admin/SavePresetDialog";
import { ManagePresetsDialog } from "@/components/admin/ManagePresetsDialog";

/**
 * HU-6.2 — Dropdown de configurações salvas (presets).
 *
 * Posicionado no header de ReportsAnalyticsPage ao lado do ThemeSwitcher.
 * Lista todos os presets do usuário + opções "Salvar atual..." e
 * "Gerenciar configurações...". Clicar em um preset aplica o tema dele
 * via WidgetThemeContext (que persiste em admin_widget_preferences).
 */

interface PresetsDropdownProps {
  className?: string;
  align?: "start" | "center" | "end";
}

export function PresetsDropdown({ className, align = "end" }: PresetsDropdownProps) {
  const { presets, isLoading } = useDashboardPresets();
  const { setTheme, setWidgetConfig, theme: currentTheme } = useWidgetTheme();

  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const applyPreset = (presetId: string) => {
    const p = presets.find((pp) => pp.id === presetId);
    if (!p) return;
    setTheme(p.theme);
    setWidgetConfig(p.config);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className={cn("h-9 gap-2", className)}
            aria-label="Configurações salvas"
          >
            <Bookmark className="h-4 w-4" />
            <span className="text-xs font-medium">Configurações</span>
            {presets.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {presets.length}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-80">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Configurações salvas
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {presets.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              Nenhuma configuração salva ainda.
            </div>
          ) : (
            presets.map((p) => {
              const themeMeta = getTheme(p.theme);
              const isCurrent = p.theme === currentTheme;
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => applyPreset(p.id)}
                  className="flex items-center gap-2 py-2 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      {p.isDefault && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px] gap-0.5">
                          <Star className="h-2 w-2 fill-current" />
                          Padrão
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          Em uso
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Tema:{" "}
                      <span className={cn("font-medium", themeMeta.accentClass)}>
                        {themeMeta.label}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => setSaveOpen(true)}
            className="cursor-pointer text-sm gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Salvar configuração atual...
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setManageOpen(true)}
            className="cursor-pointer text-sm gap-2"
            disabled={presets.length === 0}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gerenciar...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SavePresetDialog open={saveOpen} onOpenChange={setSaveOpen} />
      <ManagePresetsDialog open={manageOpen} onOpenChange={setManageOpen} />
    </>
  );
}
