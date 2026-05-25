import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';
import { fetchThematicCommissions, type ReferralDestination } from '@/lib/referralDestinations';
import {
  buildCommissionDestinationsFromReferrals,
  fetchFilteredReportCommissionReferrals,
  type FilteredCommissionReferralRow,
} from '@/lib/referralsGlobalFilters';
import {
  fetchActiveLegislativeCommissions,
  type LegislativeCommissionOption,
} from '@/lib/reportCommissionReferrals';
import {
  commissionPointsFromDestinations,
  type CommissionChartPoint,
} from '@/lib/commissionChart';

export type CommissionCatalogEntry = LegislativeCommissionOption & { themes: string[] };

export function useReferralsCommissionsTab(selectedCommissionIds: string[]) {
  const { period, region, category, periodCompare, compareActive } = useGlobalFilters();
  const [catalog, setCatalog] = useState<CommissionCatalogEntry[]>([]);
  const [baselineDestinations, setBaselineDestinations] = useState<ReferralDestination[]>([]);
  const [referralRows, setReferralRows] = useState<FilteredCommissionReferralRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const periodCompareInput = useMemo(
    () =>
      period === PERIOD_COMPARE_VALUE && compareActive
        ? { periodA: periodCompare.periodA }
        : undefined,
    [period, compareActive, periodCompare.periodA],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [commCatalog, thematicList] = await Promise.all([
        fetchActiveLegislativeCommissions(),
        fetchThematicCommissions(),
      ]);

      const themesById = new Map(
        thematicList.map((t) => [t.id, t.themes] as const),
      );

      setCatalog(
        (commCatalog.length > 0 ? commCatalog : thematicList.map((t) => ({
          commissionId: t.id,
          name: t.name,
          code: null as string | null,
        }))).map((c) => ({
          ...c,
          themes: themesById.get(c.commissionId) ?? [],
        })),
      );
      setBaselineDestinations(thematicList);

      try {
        const rows = await fetchFilteredReportCommissionReferrals(
          period,
          region,
          category,
          periodCompareInput,
        );
        setReferralRows(rows);
      } catch (err) {
        console.error('[useReferralsCommissionsTab] filtered referrals', err);
        setReferralRows([]);
      }
    } catch (err) {
      console.error('[useReferralsCommissionsTab] load', err);
      setCatalog([]);
      setBaselineDestinations([]);
      setReferralRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [period, region, category, periodCompareInput]);

  useEffect(() => {
    void load();
  }, [load]);

  const catalogForBuild = useMemo(
    () =>
      catalog.map((c) => ({
        commissionId: c.commissionId,
        name: c.name,
        code: c.code,
        themes: c.themes,
      })),
    [catalog],
  );

  const allDestinations = useMemo(() => {
    const fromFiltered = buildCommissionDestinationsFromReferrals(
      referralRows,
      catalogForBuild,
    );
    if (fromFiltered.length > 0) return fromFiltered;
    return baselineDestinations;
  }, [referralRows, catalogForBuild, baselineDestinations]);

  const filteredDestinations = useMemo(() => {
    if (selectedCommissionIds.length === 0) return allDestinations;
    const wanted = new Set(selectedCommissionIds);
    return allDestinations.filter((d) => wanted.has(d.id));
  }, [allDestinations, selectedCommissionIds]);

  const chartData: CommissionChartPoint[] = useMemo(
    () => commissionPointsFromDestinations(filteredDestinations),
    [filteredDestinations],
  );

  const resultCount = useMemo(
    () =>
      referralRows.filter((r) => {
        if (selectedCommissionIds.length === 0) return true;
        return selectedCommissionIds.includes(r.commissionId);
      }).length,
    [referralRows, selectedCommissionIds],
  );

  return {
    catalog,
    destinations: filteredDestinations,
    chartData,
    resultCount,
    isLoading,
    refresh: load,
  };
}
