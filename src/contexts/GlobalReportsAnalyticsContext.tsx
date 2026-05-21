import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import {
  useReportsAnalytics,
  type ReportsAnalyticsStats,
} from '@/hooks/useReportsAnalytics';

export type GlobalReportsAnalyticsValue = {
  stats: ReportsAnalyticsStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => void;
};

const GlobalReportsAnalyticsContext =
  createContext<GlobalReportsAnalyticsValue | null>(null);

/** Uma única carga de analytics com filtros globais (evita N subscriptions). */
export function GlobalReportsAnalyticsProvider({ children }: { children: ReactNode }) {
  const { period, region, category } = useGlobalFilters();
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );
  const { stats, isLoading, error, refresh, lastUpdate } = useReportsAnalytics(filters);

  const value = useMemo<GlobalReportsAnalyticsValue>(
    () => ({ stats, isLoading, error, lastUpdate, refresh }),
    [stats, isLoading, error, lastUpdate, refresh],
  );

  return (
    <GlobalReportsAnalyticsContext.Provider value={value}>
      {children}
    </GlobalReportsAnalyticsContext.Provider>
  );
}

export function useGlobalReportsAnalytics(): GlobalReportsAnalyticsValue {
  const ctx = useContext(GlobalReportsAnalyticsContext);
  if (!ctx) {
    throw new Error(
      'useGlobalReportsAnalytics must be used within GlobalReportsAnalyticsProvider',
    );
  }
  return ctx;
}

export function useOptionalGlobalReportsAnalytics(): GlobalReportsAnalyticsValue | null {
  return useContext(GlobalReportsAnalyticsContext);
}
