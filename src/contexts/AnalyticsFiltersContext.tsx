import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  computePeriodB,
  type PeriodComparePickerValue,
} from '@/components/filters/PeriodComparePicker';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';
import { isCompleteDateRange } from '@/lib/dateRangeUtils';
import { globalPeriodKeyToDateRange } from '@/lib/globalPeriodRange';

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

function buildCompareState(basePeriod: string): PeriodComparePickerValue {
  const { from, to } = globalPeriodKeyToDateRange(basePeriod);
  return {
    periodA: { from, to },
    periodB: null,
    preset: 'previous',
  };
}

type Ctx = GlobalFilters & {
  setPeriod: (v: string) => void;
  setRegion: (v: string) => void;
  setCategory: (v: string) => void;
  reset: () => void;
  lastRecalcAt: Date;
  touchRecalc: () => void;
  /** HU-5.1 — configuração A vs B quando período = comparar. */
  periodCompare: PeriodComparePickerValue;
  setPeriodCompare: (next: PeriodComparePickerValue) => void;
  /** Período fixo usado antes de entrar em modo comparar (para rótulos e fallback). */
  periodBase: string;
  compareActive: boolean;
};

const AnalyticsFiltersContext = createContext<Ctx | null>(null);

export function AnalyticsFiltersProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState(defaultFilters.period);
  const [periodBase, setPeriodBase] = useState(defaultFilters.period);
  const [region, setRegion] = useState(defaultFilters.region);
  const [category, setCategory] = useState(defaultFilters.category);
  const [periodCompare, setPeriodCompare] = useState<PeriodComparePickerValue>(() =>
    buildCompareState(defaultFilters.period),
  );
  const [lastRecalcAt, setLastRecalcAt] = useState(() => new Date());

  const setPeriod = useCallback(
    (v: string) => {
      if (v === PERIOD_COMPARE_VALUE) {
        const base = period === PERIOD_COMPARE_VALUE ? periodBase : period;
        setPeriodBase(base);
        setPeriodCompare(buildCompareState(base));
        setPeriodState(PERIOD_COMPARE_VALUE);
        return;
      }
      setPeriodState(v);
      setPeriodBase(v);
      setPeriodCompare((prev) => {
        const { from, to } = globalPeriodKeyToDateRange(v);
        let nextB = prev.periodB;
        if (prev.periodB && (prev.preset === 'previous' || prev.preset === 'year_ago')) {
          nextB = computePeriodB({ from, to }, prev.preset, prev.periodB);
        }
        return { periodA: { from, to }, periodB: nextB, preset: prev.preset };
      });
    },
    [period, periodBase],
  );

  const reset = useCallback(() => {
    setPeriodState(defaultFilters.period);
    setPeriodBase(defaultFilters.period);
    setRegion(defaultFilters.region);
    setCategory(defaultFilters.category);
    setPeriodCompare(buildCompareState(defaultFilters.period));
  }, []);

  const compareActive =
    period === PERIOD_COMPARE_VALUE &&
    isCompleteDateRange(periodCompare.periodA) &&
    periodCompare.periodB !== null &&
    isCompleteDateRange(periodCompare.periodB);

  useEffect(() => {
    setLastRecalcAt(new Date());
  }, [period, region, category, periodCompare.periodA, periodCompare.periodB, periodCompare.preset]);

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
      periodCompare,
      setPeriodCompare,
      periodBase,
      compareActive,
    }),
    [
      period,
      region,
      category,
      setPeriod,
      reset,
      lastRecalcAt,
      touchRecalc,
      periodCompare,
      periodBase,
      compareActive,
    ],
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
