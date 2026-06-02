import { useMemo } from "react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import {
  globalPeriodToHeatmapExtendedPeriod,
  type HeatmapExtendedPeriod,
} from "@/lib/globalPeriodRange";

/** Período dos mapas de calor (30d / 90d / 12m) derivado do recorte global. */
export function useGlobalHeatmapExtendedPeriod(): HeatmapExtendedPeriod {
  const { period, periodCompare } = useGlobalFilters();
  return useMemo(
    () => globalPeriodToHeatmapExtendedPeriod(period, { periodA: periodCompare.periodA }),
    [period, periodCompare.periodA],
  );
}
