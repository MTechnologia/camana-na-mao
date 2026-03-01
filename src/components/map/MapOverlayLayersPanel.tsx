import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Layers, Loader2, AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import { GEOSAMPA_OVERLAY_LAYERS } from "@/config/geosampa-overlay-layers";
import type { GeoSampaOverlayState } from "@/hooks/useGeoSampaOverlay";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE = 10;

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
  const [expanded, setExpanded] = useState(false);
  const toggle = (id: string, enabled: boolean) => {
    if (enabled) {
      onEnabledChange([...enabledLayerIds, id]);
    } else {
      onEnabledChange(enabledLayerIds.filter((x) => x !== id));
    }
  };

  const visibleLayers = expanded
    ? GEOSAMPA_OVERLAY_LAYERS
    : GEOSAMPA_OVERLAY_LAYERS.slice(0, INITIAL_VISIBLE);
  const hasMore = GEOSAMPA_OVERLAY_LAYERS.length > INITIAL_VISIBLE;

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
      <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto w-[min(320px,90vw)] sm:w-[min(360px,90vw)]">
        <DropdownMenuLabel>Ativar camadas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-1 gap-0 p-1">
        {visibleLayers.map((layer) => {
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
        </div>
        {hasMore && (
          <div className="p-1.5 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center text-primary text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded
                ? "Ver menos"
                : `Ver mais (${GEOSAMPA_OVERLAY_LAYERS.length - INITIAL_VISIBLE} camadas)`}
              <ChevronDown className={cn("w-3.5 h-3.5 ml-1", expanded && "rotate-180")} />
            </Button>
          </div>
        )}
        <DropdownMenuSeparator />
        <div className="p-2 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground px-2">Legislação Urbana e Zoneamento</p>
          <a
            href="https://www.prefeitura.sp.gov.br/web/licenciamento/w/legislacao/288079"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-accent"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            Legenda do zoneamento (LPUOS)
          </a>
          <a
            href="https://geosampa.prefeitura.sp.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-accent"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            Consultar no GeoSampa
          </a>
          <a
            href="https://consultasiszon.prefeitura.sp.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-accent"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            Consulta zoneamento por endereço (SISZON)
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
