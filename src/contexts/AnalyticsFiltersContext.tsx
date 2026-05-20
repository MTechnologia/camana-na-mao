import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Filtros globais (RN-ANL-002) — estado local até integração com API. */
export type GlobalFilters = {
  period: string;
  region: string;
  category: string;
};

const defaultFilters: GlobalFilters = {
  period: 'last_30d',
  region: 'all',
  category: 'all',
};

type Ctx = GlobalFilters & {
  setPeriod: (v: string) => void;
  setRegion: (v: string) => void;
  setCategory: (v: string) => void;
  reset: () => void;
  lastRecalcAt: Date;
  touchRecalc: () => void;
};

const AnalyticsFiltersContext = createContext<Ctx | null>(null);

export function AnalyticsFiltersProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState(defaultFilters.period);
  const [region, setRegion] = useState(defaultFilters.region);
  const [category, setCategory] = useState(defaultFilters.category);
  const [lastRecalcAt, setLastRecalcAt] = useState(() => new Date());

  const reset = useCallback(() => {
    setPeriod(defaultFilters.period);
    setRegion(defaultFilters.region);
    setCategory(defaultFilters.category);
  }, []);

  useEffect(() => {
    setLastRecalcAt(new Date());
  }, [period, region, category]);

  const touchRecalc = useCallback(() => {
    setLastRecalcAt(new Date());
  }, []);

  const value = useMemo(
    () => ({
      period,
      region,
      category,
      setPeriod,
      setRegion,
      setCategory,
      reset,
      lastRecalcAt,
      touchRecalc,
    }),
    [period, region, category, reset, lastRecalcAt, touchRecalc],
  );

  return (
    <AnalyticsFiltersContext.Provider value={value}>
      {children}
    </AnalyticsFiltersContext.Provider>
  );
}

export function useGlobalFilters(): Ctx {
  const ctx = useContext(AnalyticsFiltersContext);
  if (!ctx) {
    throw new Error('useGlobalFilters must be used within AnalyticsFiltersProvider');
  }
  return ctx;
}
