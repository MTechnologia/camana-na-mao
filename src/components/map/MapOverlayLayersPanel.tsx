import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Layers, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { GEOSAMPA_OVERLAY_LAYERS } from "@/config/geosampa-overlay-layers";
import type { GeoSampaOverlayState } from "@/hooks/useGeoSampaOverlay";
import { cn } from "@/lib/utils";

interface MapOverlayLayersPanelProps {
  enabledLayerIds: string[];
  onEnabledChange: (ids: string[]) => void;
  layerStates?: Record<string, GeoSampaOverlayState>;
}

export function MapOverlayLayersPanel({
  enabledLayerIds,
  onEnabledChange,
  layerStates = {},
}: MapOverlayLayersPanelProps) {
  const toggle = (id: string, enabled: boolean) => {
    if (enabled) {
      onEnabledChange([...enabledLayerIds, id]);
    } else {
      onEnabledChange(enabledLayerIds.filter((x) => x !== id));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="shadow-sm gap-2"
        >
          <Layers className="w-4 h-4" />
          Camadas GeoSampa
          {enabledLayerIds.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded">
              {enabledLayerIds.length}
            </span>
          )}
          <ChevronDown className="w-4 h-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto min-w-[280px] w-max max-w-[90vw]">
        <DropdownMenuLabel>Ativar camadas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {GEOSAMPA_OVERLAY_LAYERS.map((layer) => {
          const state = layerStates[layer.id];
          const loading = state?.loading;
          const error = state?.error;
          const enabled = enabledLayerIds.includes(layer.id);
          return (
            <DropdownMenuCheckboxItem
              key={layer.id}
              checked={enabled}
              onCheckedChange={(checked) => toggle(layer.id, !!checked)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="flex items-center gap-2 flex-1 min-w-0">
                {loading && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                )}
                {error && !loading && (
                  <span title={error} aria-label="Erro ao carregar">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                  </span>
                )}
                <span className={cn("truncate", error && "text-destructive")}>
                  {layer.label}
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
