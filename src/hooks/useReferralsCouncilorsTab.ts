import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { PERIOD_COMPARE_VALUE } from "@/lib/globalFilterOptions";
import { councilMemberPointsFromDestinations } from "@/lib/councilMemberChart";
import type { CouncilMemberChartPoint } from "@/lib/councilMemberChart";
import {
  fetchCouncilMemberDestinations,
  type ReferralDestination,
} from "@/lib/referralDestinations";
import {
  buildCouncilMemberDestinationsFromReferrals,
  fetchFilteredCouncilMemberReferrals,
  type FilteredCouncilReferralRow,
} from "@/lib/referralsGlobalFilters";

export type CouncilMemberCatalogEntry = {
  councilMemberId: string;
  name: string;
};

export function useReferralsCouncilorsTab(selectedCouncilMemberIds: string[]) {
  const { period, region, category, periodCompare, compareActive } = useGlobalFilters();
  const [catalog, setCatalog] = useState<CouncilMemberCatalogEntry[]>([]);
  const [baselineDestinations, setBaselineDestinations] = useState<ReferralDestination[]>([]);
  const [referralRows, setReferralRows] = useState<FilteredCouncilReferralRow[]>([]);
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
      const memberList = await fetchCouncilMemberDestinations();
      setCatalog(
        memberList.map((m) => ({
          councilMemberId: m.id,
          name: m.name,
        })),
      );
      setBaselineDestinations(memberList);

      const rows = await fetchFilteredCouncilMemberReferrals(
        period,
        region,
        category,
        periodCompareInput,
      );
      setReferralRows(rows);
    } catch (err) {
      console.error("[useReferralsCouncilorsTab] load", err);
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
        id: c.councilMemberId,
        name: c.name,
        themes: baselineDestinations.find((d) => d.id === c.councilMemberId)?.themes ?? [],
      })),
    [catalog, baselineDestinations],
  );

  const allDestinations = useMemo(() => {
    const fromFiltered = buildCouncilMemberDestinationsFromReferrals(referralRows, catalogForBuild);
    if (fromFiltered.length > 0) return fromFiltered;
    return baselineDestinations;
  }, [referralRows, catalogForBuild, baselineDestinations]);

  const filteredDestinations = useMemo(() => {
    if (selectedCouncilMemberIds.length === 0) return allDestinations;
    const wanted = new Set(selectedCouncilMemberIds);
    return allDestinations.filter((d) => wanted.has(d.id));
  }, [allDestinations, selectedCouncilMemberIds]);

  const chartData: CouncilMemberChartPoint[] = useMemo(
    () => councilMemberPointsFromDestinations(filteredDestinations),
    [filteredDestinations],
  );

  const resultCount = useMemo(
    () =>
      referralRows.filter((r) => {
        if (selectedCouncilMemberIds.length === 0) return true;
        return selectedCouncilMemberIds.includes(r.councilMemberId);
      }).length,
    [referralRows, selectedCouncilMemberIds],
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
