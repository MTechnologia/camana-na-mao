import { useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Globe, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VolumeFilters } from "./VolumeFilters";
import { FilterHint } from "./FilterHint";
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
  /**
   * Tooltip do header do bloco "Filtros gerais". Default explica que
   * esses filtros se aplicam a todos os cortes da aba.
   */
  volumeHint?: string;
  /** Conteúdo do facet por aba. Quando null/undefined, a seção some. */
  facet?: ReactNode;
  /** Nome curto da aba pra compor o label "Filtros específicos: [nome]". */
  facetLabel?: string;
  /** Tooltip do header do facet. Default genérico. */
  facetHint?: string;
  /** Quantos filtros estão ativos no facet (mostrado no badge). */
  facetActiveCount?: number;
  /** Iniciar com facet expandido (default: true se houver filtros ativos). */
  defaultFacetExpanded?: boolean;
}

const DEFAULT_VOLUME_HINT =
  "Filtros gerais — se aplicam a todos os cortes desta aba (KPIs, gráficos e listas). Se você trocar de aba, eles continuam ativos.";

const DEFAULT_FACET_HINT =
  "Filtros específicos desta aba — refinam ainda mais o recorte após os filtros gerais. Não afetam outras abas.";

export function AnalyticsFiltersBar({
  volumeProps,
  volumeHint = DEFAULT_VOLUME_HINT,
  facet,
  facetLabel,
  facetHint = DEFAULT_FACET_HINT,
  facetActiveCount = 0,
  defaultFacetExpanded,
}: AnalyticsFiltersBarProps) {
  const [expanded, setExpanded] = useState(
    defaultFacetExpanded ?? facetActiveCount > 0,
  );

  // Mantém o VolumeFilters sem o título próprio: o cabeçalho hierárquico abaixo
  // já marca "Filtros gerais", então passamos showHeader={false}.
  const volumePropsForRender = { ...volumeProps, showHeader: false };

  return (
    <Card className="p-3 space-y-3">
      {/* === Bloco geral === */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground/80 uppercase tracking-wide">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span>F