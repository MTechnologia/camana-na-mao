import { useMemo } from "react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import type { WidgetFilters } from "@/types/customPanel";

export type ResolvedWidgetFilters = {
  period: string;
  region: string;
  category: string;
  useGlobal: boolean;
};

export function useResolvedWidgetFilters(widgetFilters: WidgetFilters): ResolvedWidgetFilters {
  const global = useGlobalFilters();

  return useMemo(() => {
    const useGlobal = widgetFilters.useGlobalFilters !== false;
    const inherit = (local?: string) => (!local || local === "inherit" ? undefined : local);

    return {
      period: (useGlobal ? global.period : inherit(widgetFilters.period)) ?? global.period,
      region: (useGlobal ? global.region : inherit(widgetFilters.region)) ?? global.region,
      category: (useGlobal ? global.category : inherit(widgetFilters.category)) ?? global.category,
      useGlobal,
    };
  }, [
    widgetFilters.useGlobalFilters,
    widgetFilters.period,
    widgetFilters.region,
    widgetFilters.category,
    global.period,
    global.region,
    global.category,
  ]);
}
