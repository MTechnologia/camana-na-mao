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
import { Checkbox } from "@/components/ui/checkbox";

const INITIAL_VISIBLE = 10;

interface MapOverlayLayersPanelProps {
  enabledLayerIds: string[];
  onEnabledChange: (ids: string[]) => void;
  layerStates?: Record<string, GeoSampaOverlayState>;
  /** Camada WMS de imageamento (fotos aéreas) – só com Google Maps */
  wmsImageamentoEnabled?: boolean;
  onWmsImageamentoChange?: (enabled: boolean) => void;
}

export function MapOverlayLayersPanel({
  enabledLayerIds,
  onEnabledChange,
  layerStates = {},
  wmsImageamentoEnabled = false,
  onWmsImageamentoChange,
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
      <DropdownMenuContent
        align="start"
        className="w-[min(320px,90vw)] overflow-hidden p-0 sm:w-[min(360px,90vw)]"
      >
        <div
          className="max-h-[min(70vh,85dvh)] overflow-y-auto overscroll-contain py-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35"
        >
          <DropdownMenuLabel>Ativar camadas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {onWmsImageamentoChange != null && (
            <>
              <div
                className="flex items-center gap-2 rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none cursor-pointer hover:bg-accent focus:bg-accent"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  id="wms-imageamento"
                  checked={wmsImageamentoEnabled}
                  onCheckedChange={(checked) => onWmsImageamentoChange(checked === true)}
                />
                <label
                  htmlFor="wms-imageamento"
                  className="flex-1 cursor-pointer truncate"
                >
                  Imageamento (fotos aéreas)
                </label>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
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
            <div className="border-t p-1.5">
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
          <div className="space-y-1.5 p-2">
            <p className="px-2 text-xs font-medium text-muted-foreground">Legislação Urbana e Zoneamento</p>
            <a
              href="https://www.prefeitura.sp.gov.br/web/licenciamento/w/legislacao/288079"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded px-2 py-1 text-xs text-primary hover:bg-accent hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              Legenda do zoneamento (LPUOS)
            </a>
            <a
              href="https://geosampa.prefeitura.sp.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded px-2 py-1 text-xs text-primary hover:bg-accent hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              Consultar no GeoSampa
            </a>
            <a
              href="https://consultasiszon.prefeitura.sp.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded px-2 py-1 text-xs text-primary hover:bg-accent hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              Consulta zoneamento por endereço (SISZON)
            </a>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
