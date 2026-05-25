import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFilterChipLabels } from '@/lib/globalFilterOptions';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import {
  useReportsAnalytics,
  type ReportsAnalyticsFilters,
  type ReportsAnalyticsStats,
} from '@/hooks/useReportsAnalytics';
import { useRegisterAnalyticsLive } from '@/hooks/useRegisterAnalyticsLive';

export type UrbanReportsAnalyticsFiltersState = {
  period: string;
  region: string;
  category: string;
};

type Ctx = UrbanReportsAnalyticsFiltersState & {
  filters: ReportsAnalyticsFilters;
  chipLabels: string[];
  stats: ReportsAnalyticsStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => void;
  reset: () => void;
};

const UrbanReportsAnalyticsFiltersContext = createContext<Ctx | null>(null);

export function UrbanReportsAnalyticsFiltersProvider({ children }: { children: ReactNode }) {
  const {
    period,
    region,
    category,
    periodCompare,
    reset: resetGlobal,
  } = useGlobalFilters();

  const filters = useMemo(
    () => ({
      ...globalFiltersToReportsAnalytics(period, region, category, {
        periodA: periodCompare.periodA,
      }),
      scope: 'urban_only' as const,
    }),
    [period, region, category, periodCompare.periodA],
  );

  const { stats, isLoading, error, lastUpdate, refresh } = useReportsAnalytics(filters);

  useRegisterAnalyticsLive('urban-reports-analytics', { lastUpdate, refresh });

  const value = useMemo<Ctx>(
    () => ({
      period,
      region,
      category,
      filters,
      chipLabels: globalFilterChipLabels(period, region, category),
      stats,
      isLoading,
      error,
      lastUpdate,
      refresh,
      reset: resetGlobal,
    }),
    [
      period,
      region,
      category,
      filters,
      stats,
      isLoading,
      error,
      lastUpdate,
      refresh,
      resetGlobal,
    ],
  );

  return (
    <UrbanReportsAnalyticsFiltersContext.Provider value={value}>
      {children}
    </UrbanReportsAnalyticsFiltersContext.Provider>
  );
}

export function useUrbanReportsAnalyticsFilters(): Ctx {
  const ctx = useContext(UrbanReportsAnalyticsFiltersContext);
  if (!ctx) {
    throw new Error(
      'useUrbanReportsAnalyticsFilters must be used within UrbanReportsAnalyticsFiltersProvider',
    );
  }
  return ctx;
}
