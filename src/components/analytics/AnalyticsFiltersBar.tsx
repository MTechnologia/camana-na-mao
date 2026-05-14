import { useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VolumeFilters } from "./VolumeFilters";
import { cn } from "@/lib/utils";

/**
 * HU-14.2 — Wrapper que combina o `VolumeFilters` global (tronco) com
 * um slot opcional para a faceta da aba ativa.
 *
 * Estrutura visual:
 *
 *   ┌─ Tronco (VolumeFilters) ───────────────────────┐
 *   │ Período │ Categorias │ Regiões │ Zonas        │
 *   ├─ Faceta (slot, opcional, colapsável) ──────────┤
 *   │ [CriticidadeFacetPicker | EficienciaFacetPicker│
 *   │  | AudienciasFacetPicker]                      │
 *   └────────────────────────────────────────────────┘
 *
 * Pass-through: todas as props do VolumeFilters são propagadas via
 * `volumeProps`. Cada aba passa o conjunto que faz sentido pra ela
 * (ex: AudienciasTab oculta showRegions porque não se aplica).
 */

type VolumeFiltersProps = ComponentProps<typeof VolumeFilters>;

interface AnalyticsFiltersBarProps {
  /** Props que vão direto para o VolumeFilters interno. */
  volumeProps: VolumeFiltersProps;
  /** Conteúdo do facet por aba. Quando null/undefined, a seção some. */
  facet?: ReactNode;
  /** Texto descritivo do facet (default "Filtros adicionais"). */
  facetLabel?: string;
  /** Quantos filtros estão ativos no facet (mostrado no badge). */
  facetActiveCount?: number;
  /** Iniciar com facet expandido (default: true se houver filtros ativos). */
  defaultFacetExpanded?: boolean;
}

export function AnalyticsFiltersBar({
  volumeProps,
  facet,
  facetLabel = "Filtros adicionais",
  facetActiveCount = 0,
  defaultFacetExpanded,
}: AnalyticsFiltersBarProps) {
  const [expanded, setExpanded] = useState(
    defaultFacetExpanded ?? facetActiveCount > 0,
  );

  return (
    <Card className="p-3 space-y-3">
      {/* Tronco — sempre visível */}
      <VolumeFilters {...volumeProps} />

      {/* Faceta — opcional, com separador acordeão */}
      {facet && (
        <div className="border-t border-border/40 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "w-full justify-between text-xs font-medium",
              expanded && "mb-2",
            )}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {facetLabel}
              {facetActiveCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {facetActiveCount}
                </Badge>
              )}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          {expanded && <div className="pt-1">{facet}</div>}
        </div>
      )}
    </Card>
  );
}
