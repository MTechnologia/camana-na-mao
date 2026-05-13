import type { DateRangeValue } from "@/components/filters/types";
import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * Constantes do componente VolumeFilters (HU-1.1).
 * Mantidas em arquivo separado para satisfazer a regra
 * `react-refresh/only-export-components` no arquivo do componente.
 */

export interface VolumeFiltersValue {
  period: DateRangeValue | undefined;
  categories: string[];
  regions: string[];
  zones: ZonaVolumeOuDesconhecida[];
}

export const EMPTY_VOLUME_FILTERS: VolumeFiltersValue = {
  period: undefined,
  categories: [],
  regions: [],
  zones: [],
};
