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
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import {
  buildChartSeriesFromStats,
  buildDrillKpisFromStats,
} from '@/lib/analyticsDrillFromStats';
import { fetchDrillThroughReports } from '@/lib/fetchDrillThroughReports';
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

export function AnalyticsDrillProvider({ children }: { children: ReactNode }) {
  const { period, region, category, setRegion, setCategory } = useGlobalFilters();
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );
  const { stats } = useReportsAnalytics(filters);

  const [metric, setMetric] = useState<AnalyticsMetric>('volume');
  const [grain, setGrain] = useState<DrillGrain>('overview');
  const [drillPath, setDrillPath] = useState<DrillCrumb[]>([OVERVIEW_CRUMB]);
  const [activeRegion, setActiveRegion] = useState<string | undefined>();
  const [activeDistrict, setActiveDistrict] = useState<string | undefined>();
  const [selectedBar, setSelectedBar] = useState<ChartBarPoint | undefined>();
  const [throughOpen, setThroughOpen] = useState(false);
  const [throughReports, setThroughReports] = useState<DrillReportRow[]>([]);
  const [throughLoading, setThroughLoading] = useState(false);

  const resetDrill = useCallback(() => {
    setGrain('overview');
    setDrillPath([OVERVIEW_CRUMB]);
    setActiveRegion(undefined);
    setActiveDistrict(undefined);
    setSelectedBar(undefined);
    setThroughOpen(false);
    setThroughReports([]);
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

  const kpis = useMemo(
    () => buildDrillKpisFromStats(stats, grain),
    [stats, grain],
  );

  const chartData = useMemo(
    () => buildChartSeriesFromStats(stats, grain, metric, activeRegion, category),
    [stats, grain, metric, activeRegion, category],
  );

  useEffect(() => {
    if (!selectedBar || !throughOpen) {
      setThroughReports([]);
      return;
    }
    let cancelled = false;
    setThroughLoading(true);
    void fetchDrillThroughReports(filters, selectedBar).then((rows) => {
      if (!cancelled) {
        setThroughReports(rows);
        setThroughLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBar, throughOpen, filters]);

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
        setGrain('district');
        setDrillPath((prev) => [
          ...prev.slice(0, 2),
          { id: `district-${point.filterValue}`, grain: 'district', label: point.label },
        ]);
        return;
      }

      if (point.filterKey === 'category') {
        setCategory(point.filterValue);
        setGrain('district');
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
      throughLoading,
      drillDown,
      drillUp,
      resetDrill,
      setRegion,
      setCategory,
    ],
  );

  return (
    <AnalyticsDrillContext.Provider value={value}>{children}</AnalyticsDrillContext.Provider>
  );
}

export function useAnalyticsDrill(): AnalyticsDrillContextValue {
  const ctx = useContext(AnalyticsDrillContext);
  if (!ctx) {
    throw new Error('useAnalyticsDrill must be used within AnalyticsDrillProvider');
  }
  return ctx;
}
