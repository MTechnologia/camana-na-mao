import { useMemo } from "react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import {
  globalPeriodToShortcutPeriod,
  type AnalyticsShortcutPeriod,
} from "@/lib/globalPeriodRange";

/** Período curto derivado do recorte global (barra unificada). */
export function useGlobalShortcutPeriod(): AnalyticsShortcutPeriod {
  const { period, periodCompare } = useGlobalFilters();
  return useMemo(
    () => globalPeriodToShortcutPeriod(period, { periodA: periodCompare.periodA }),
    [period, periodCompare.periodA],
  );
}
