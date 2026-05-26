import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import {
  useOptionalGlobalReportsAnalytics,
} from '@/contexts/GlobalReportsAnalyticsContext';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import {
  useReportsAnalytics,
  type ReportsAnalyticsFilters,
  type ReportsAnalyticsStats,
} from '@/hooks/useReportsAnalytics';
import {
  buildChartSeriesFromStats,
  buildDrillKpisForRegionFilter,
  buildDrillKpisFromStats,
} from '@/lib/analyticsDrillFromStats';
import {
  DRILL_THROUGH_PAGE_SIZE,
  drillThroughTotalPages,
  fetchDrillThroughReports,
  paginateDrillThroughReports,
} from '@/lib/fetchDrillThroughReports';
import { regionLabel } from '@/lib/analyticsLabels';
import type {
  AnalyticsMetric,
  ChartBarPoint,
  DrillCrumb,
  DrillGrain,
  DrillKpis,
  DrillReportRow,
} from '@/types/analyticsDrill';

type AnalyticsDrillContextValue = {
  metric: AnalyticsMetric;
  setMetric: (m: AnalyticsMetric) => void;
  grain: DrillGrain;
  drillPath: DrillCrumb[];
  activeRegion?: string;
  activeDistrict?: string;
  kpis: DrillKpis;
  chartData: ChartBarPoint[];
  selectedBar?: ChartBarPoint;
  throughOpen: boolean;
  throughReports: DrillReportRow[];
  throughReportsPage: DrillReportRow[];
  throughTotal: number;
  throughPage: number;
  throughTotalPages: number;
  throughPageSize: number;
  setThroughPage: (page: number) => void;
  throughLoading: boolean;
  drillDown: (point: ChartBarPoint) => void;
  drillUp: (index: number) => void;
  clearDrill: () => void;
  selectBar: (point: ChartBarPoint | undefined) => void;
  openDrillThrough: () => void;
  closeDrillThrough: () => void;
};

const AnalyticsDrillContext = createContext<AnalyticsDrillContextValue | null>(null);

const OVERVIEW_CRUMB: DrillCrumb = { id: 'overview', grain: 'overview', label: 'São Paulo (capital)' };

function AnalyticsDrillLocalLoader({
  children,
  filters,
}: {
  children: ReactNode;
  filters: ReportsAnalyticsFilters;
}) {
  const { stats } = useReportsAnalytics(filters);
  return (
    <AnalyticsDrillStateProvider stats={stats} filters={filters}>
      {children}
    </AnalyticsDrillStateProvider>
  );
}

function AnalyticsDrillStateProvider({
  children,
  stats,
  filters,
}: {
  children: ReactNode;
  stats: ReportsAnalyticsStats | null;
  filters: ReportsAnalyticsFilters;
}) {
  const { region, setRegion, setCategory } = useGlobalFilters();

  const [metric, setMetric] = useState<AnalyticsMetric>('volume');
  const [grain, setGrain] = useState<DrillGrain>('overview');
  const [drillPath, setDrillPath] = useState<DrillCrumb[]>([OVERVIEW_CRUMB]);
  const [activeRegion, setActiveRegion] = useState<string | undefined>();
  const [activeDistrict, setActiveDistrict] = useState<string | undefined>();
  const [selectedBar, setSelectedBar] = useState<ChartBarPoint | undefined>();
  const [throughOpen, setThroughOpen] = useState(false);
  const [throughReports, setThroughReports] = useState<DrillReportRow[]>([]);
  const [throughTotal, setThroughTotal] = useState(0);
  const [throughPage, setThroughPage] = useState(1);
  const [throughLoading, setThroughLoading] = useState(false);

  const throughTotalPages = useMemo(
    () => drillThroughTotalPages(throughTotal),
    [throughTotal],
  );

  const throughReportsPage = useMemo(
    () => paginateDrillThroughReports(throughReports, throughPage),
    [throughReports, throughPage],
  );

  const resetDrill = useCallback(() => {
    setGrain('overview');
    setDrillPath([OVERVIEW_CRUMB]);
    setActiveRegion(undefined);
    setActiveDistrict(undefined);
    setSelectedBar(undefined);
    setThroughOpen(false);
    setThroughReports([]);
    setThroughTotal(0);
    setThroughPage(1);
  }, []);

  useEffect(() => {
    if (region === 'all') {
      if (grain !== 'overview') resetDrill();
      return;
    }
    if (activeRegion !== region) {
      setActiveRegion(region);
      setActiveDistrict(undefined);
      setGrain('region');
      setDrillPath([
        OVERVIEW_CRUMB,
        { id: `region-${region}`, grain: 'region', label: regionLabel(region) },
      ]);
    }
  }, [region, grain, activeRegion, resetDrill]);

  const kpis = useMemo(() => {
    if (region !== 'all' && grain === 'region' && activeRegion === region) {
      return buildDrillKpisForRegionFilter(stats, region);
    }
    return buildDrillKpisFromStats(stats, grain, activeRegion, activeDistrict);
  }, [stats, grain, activeRegion, activeDistrict, region]);

  const chartData = useMemo(
    () => buildChartSeriesFromStats(stats, grain, metric, activeRegion, activeDistrict),
    [stats, grain, metric, activeRegion, activeDistrict],
  );

  useEffect(() => {
    if (!selectedBar || !throughOpen) {
      setThroughReports([]);
      setThroughTotal(0);
      setThroughPage(1);
      return;
    }
    let cancelled = false;
    setThroughLoading(true);
    setThroughPage(1);
    void fetchDrillThroughReports(filters, selectedBar, { activeRegion, activeDistrict })
      .then((result) => {
        if (!cancelled) {
          setThroughReports(result.reports);
          setThroughTotal(result.total);
          setThroughLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[AnalyticsDrill] drill-through', err);
        if (!cancelled) {
          setThroughReports([]);
          setThroughTotal(0);
          setThroughLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBar, throughOpen, filters, activeRegion, activeDistrict]);

  const drillDown = useCallback(
    (point: ChartBarPoint) => {
      setSelectedBar(point);
      setThroughOpen(false);

      if (point.filterKey === 'region') {
        setActiveRegion(point.filterValue);
        setActiveDistrict(undefined);
        setGrain('region');
        setRegion(point.filterValue);
        setDrillPath([
          OVERVIEW_CRUMB,
          { id: `region-${point.filterValue}`, grain: 'region', label: point.label },
        ]);
        return;
      }

      if (point.filterKey === 'district') {
        setActiveDistrict(point.filterValue);
        setGrain('street');
        setDrillPath((prev) => [
          ...prev.slice(0, 2),
          { id: `district-${point.filterValue}`, grain: 'street', label: point.label },
        ]);
        return;
      }

      if (point.filterKey === 'category') {
        setCategory(point.filterValue);
      }
    },
    [setRegion, setCategory],
  );

  const drillUp = useCallback(
    (index: number) => {
      setThroughOpen(false);
      setSelectedBar(undefined);

      if (index <= 0) {
        resetDrill();
        setRegion('all');
        setCategory('all');
        return;
      }

      const nextPath = drillPath.slice(0, index + 1);
      const crumb = nextPath[nextPath.length - 1];

      if (crumb.grain === 'region') {
        const regionId = crumb.id.replace('region-', '');
        setGrain('region');
        setActiveRegion(regionId);
        setActiveDistrict(undefined);
        setRegion(regionId);
        setDrillPath(nextPath);
        return;
      }

      if (crumb.grain === 'street' && crumb.id.startsWith('district-')) {
        const districtId = crumb.id.replace('district-', '');
        const regionCrumb = nextPath.find((c) => c.grain === 'region');
        const regionId = regionCrumb?.id.replace('region-', '') ?? activeRegion;
        setGrain('street');
        setActiveRegion(regionId);
        setActiveDistrict(districtId);
        if (regionId) setRegion(regionId);
        setDrillPath(nextPath);
        return;
      }

      resetDrill();
      setRegion('all');
    },
    [drillPath, resetDrill, setRegion, setCategory],
  );

  const value = useMemo<AnalyticsDrillContextValue>(
    () => ({
      metric,
      setMetric,
      grain,
      drillPath,
      activeRegion,
      activeDistrict,
      kpis,
      chartData,
      selectedBar,
      throughOpen,
      throughReports,
      throughReportsPage,
      throughTotal,
      throughPage,
      throughTotalPages,
      throughPageSize: DRILL_THROUGH_PAGE_SIZE,
      setThroughPage,
      throughLoading,
      drillDown,
      drillUp,
      clearDrill: () => {
        resetDrill();
        setRegion('all');
        setCategory('all');
      },
      selectBar: setSelectedBar,
      openDrillThrough: () => setThroughOpen(true),
      closeDrillThrough: () => setThroughOpen(false),
    }),
    [
      metric,
      grain,
      drillPath,
      activeRegion,
      activeDistrict,
      kpis,
      chartData,
      selectedBar,
      throughOpen,
      throughReports,
      throughReportsPage,
      throughTotal,
      throughPage,
      throughTotalPages,
      throughLoading,
      drillDown,
      drillUp,
      resetDrill,
      setRegion,
      setCategory,
      setThroughPage,
    ],
  );

  return (
    <AnalyticsDrillContext.Provider value={value}>{children}</AnalyticsDrillContext.Provider>
  );
}

/** Sempre montado no layout admin — ReportDrillSheet depende deste contexto. */
export function AnalyticsDrillProvider({ children }: { children: ReactNode }) {
  const global = useOptionalGlobalReportsAnalytics();
  const { period, region, category, periodCompare } = useGlobalFilters();
  const filters = useMemo(
    () =>
      globalFiltersToReportsAnalytics(period, region, category, {
        periodA: periodCompare.periodA,
      }),
    [period, region, category, periodCompare.periodA],
  );

  if (global) {
    return (
      <AnalyticsDrillStateProvider stats={global.stats} filters={filters}>
        {children}
      </AnalyticsDrillStateProvider>
    );
  }

  return <AnalyticsDrillLocalLoader filters={filters}>{children}</AnalyticsDrillLocalLoader>;
}

export function useAnalyticsDrill(): AnalyticsDrillContextValue {
  const ctx = useContext(AnalyticsDrillContext);
  if (!ctx) {
    throw new Error('useAnalyticsDrill must be used within AnalyticsDrillProvider');
  }
  return ctx;
}
