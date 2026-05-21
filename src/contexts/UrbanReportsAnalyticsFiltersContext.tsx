import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  useReportsAnalytics,
  type ReportsAnalyticsFilters,
  type ReportsAnalyticsStats,
} from '@/hooks/useReportsAnalytics';
import { urbanReportsFiltersToReportsAnalytics } from '@/lib/urbanReportsFiltersToAnalytics';
import { urbanAnalyticsFilterChipLabels } from '@/lib/urbanReportsAnalyticsFilterOptions';

export type UrbanReportsAnalyticsFiltersState = {
  period: string;
  category: string;
  status: string;
};

const defaults: UrbanReportsAnalyticsFiltersState = {
  period: 'last_30d',
  category: 'all',
  status: 'all',
};

type Ctx = UrbanReportsAnalyticsFiltersState & {
  filters: ReportsAnalyticsFilters;
  chipLabels: string[];
  stats: ReportsAnalyticsStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => void;
  setPeriod: (v: string) => void;
  setCategory: (v: string) => void;
  setStatus: (v: string) => void;
  reset: () => void;
};

const UrbanReportsAnalyticsFiltersContext = createContext<Ctx | null>(null);

export function UrbanReportsAnalyticsFiltersProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState(defaults.period);
  const [category, setCategory] = useState(defaults.category);
  const [status, setStatus] = useState(defaults.status);

  const reset = useCallback(() => {
    setPeriod(defaults.period);
    setCategory(defaults.category);
    setStatus(defaults.status);
  }, []);

  const filters = useMemo(
    () => urbanReportsFiltersToReportsAnalytics(period, category, status),
    [period, category, status],
  );
  const { stats, isLoading, error, lastUpdate, refresh } = useReportsAnalytics(filters);

  const value = useMemo<Ctx>(
    () => ({
      period,
      category,
      status,
      filters,
      chipLabels: urbanAnalyticsFilterChipLabels(period, category, status),
      stats,
      isLoading,
      error,
      lastUpdate,
      refresh,
      setPeriod,
      setCategory,
      setStatus,
      reset,
    }),
    [
      period,
      category,
      status,
      filters,
      stats,
      isLoading,
      error,
      lastUpdate,
      refresh,
      reset,
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
