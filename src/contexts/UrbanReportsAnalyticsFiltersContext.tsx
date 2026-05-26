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
import { useOptionalGlobalReportsAnalytics } from '@/contexts/GlobalReportsAnalyticsContext';
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

  /** Mesmo recorte do GlobalReportsAnalytics (urbano + transporte + avaliações no tema). */
  const filters = useMemo(
    () =>
      globalFiltersToReportsAnalytics(period, region, category, {
        periodA: periodCompare.periodA,
      }),
    [period, region, category, periodCompare.periodA],
  );

  const global = useOptionalGlobalReportsAnalytics();
  const local = useReportsAnalytics(filters);
  const stats = global?.stats ?? local.stats;
  const isLoading = global?.isLoading ?? local.isLoading;
  const error = global?.error ?? local.error;
  const lastUpdate = global?.lastUpdate ?? local.lastUpdate;
  const refresh = global?.refresh ?? local.refresh;

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
