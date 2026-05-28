import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseCommissionIdsFromSearchParams,
  parseCouncilMemberIdsFromSearchParams,
  parseCouncilReferralFilterFromSearchParams,
  parseGlobalFiltersFromSearchParams,
  parseReportsQueueTabFromSearchParams,
  type CouncilReferralFilter,
} from '@/lib/commissionFilterNavigation';
import {
  buildUrbanReportRowsFromCouncilReferrals,
  countNonUrbanCouncilReferrals,
  fetchUrbanManifestsForCouncilReferralIds,
} from '@/lib/councilReferralDrilldown';
import {
  buildUrbanIdsForCouncilReferralFilter,
  countCouncilReferralsForFilter,
  fetchFilteredCouncilMemberReferrals,
  filterCouncilReferralRows,
  type FilteredCouncilReferralRow,
} from '@/lib/referralsGlobalFilters';
import { toast } from 'sonner';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';
import { globalPeriodKeyToDateRange } from '@/lib/globalPeriodRange';
import { formatUrbanReportRegionLabel } from '@/lib/urbanReportRegion';
import { countByStage } from '@/lib/urbanReportLabels';
import {
  deriveUrbanWorkflowStage,
  stageToDbStatus,
} from '@/lib/urbanReportPersistence';
import {
  filterReportsForQueue,
  queueTabForStageFilter,
  type ReportsStageFilter,
} from '@/lib/urbanReportQueueFilters';
import { REPORTS_LIST_PAGE_SIZE } from '@/components/admin/reports/ReportsListPagination';
import { chunkIds } from '@/lib/chunkIds';
import {
  fetchActiveLegislativeCommissions,
  loadLatestCommissionByReportKey,
  reportCommissionKey,
  type LegislativeCommissionOption,
} from '@/lib/reportCommissionReferrals';
import {
  loadLatestCouncilReferralByUrbanIds,
  loadUrbanTriageResponsibleCommissionByReportIds,
  persistUrbanManagementReferral,
  syncReferralCommissionFromTriage,
  enrichCouncilReferralMap,
  enrichCommissionByReportId,
  resolveCommissionDisplayName,
  resolveUrbanReportResponsible,
  type UrbanCouncilReferralSnapshot,
} from '@/lib/urbanReportReferralPersistence';
import { useReportsAdmin, type UnifiedManifest } from '@/hooks/useReportsAdmin';
import { useRegisterAnalyticsLive } from '@/hooks/useRegisterAnalyticsLive';
import {
  effectiveReportTriagePriority,
  loadUrbanTriagePriorityByReportId,
} from '@/lib/triagePriority';
import type { TriagePriority } from '@/lib/triage';
import type {
  ReportQueueTab,
  UrbanReportRecord,
} from '@/types/urbanReportManagement';
import type { TriageRecord } from '@/hooks/useReportTriage';

function sortPriorities(ids: TriagePriority[]): TriagePriority[] {
  const order: TriagePriority[] = ['P0', 'P1', 'P2', 'P3'];
  const rank = new Map(order.map((p, i) => [p, i]));
  return [...ids].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}

function patchReferralMapsForReport(
  reportId: string,
  referral: NonNullable<UrbanReportRecord['referral']>,
  catalog: Map<string, string>,
): {
  councilPatch: UrbanCouncilReferralSnapshot;
  commissionPatch: { id: string; name: string };
} {
  const commissionName =
    resolveCommissionDisplayName(referral.commissionId, referral.commissionName, catalog)
    ?? referral.commissionName;
  return {
    councilPatch: {
      referralId: referral.councilReferralId ?? reportId,
      commissionId: referral.commissionId,
      commissionName,
      councillorId: referral.councillorId,
      councillorName: referral.councillorName,
      referredAt: referral.referredAt,
      matchScore: referral.matchScore,
      note: referral.note ?? null,
    },
    commissionPatch: { id: referral.commissionId, name: commissionName },
  };
}

function applyLocalReportFilters(
  list: UrbanReportRecord[],
  search: string,
  selectedPriorities: TriagePriority[],
  selectedResponsibleIds: string[],
  councilReferralUrbanIds: Set<string> | null,
): UrbanReportRecord[] {
  let out = list;
  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (r) =>
        r.protocol.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.responsibleName?.toLowerCase().includes(q) ?? false),
    );
  }
  if (selectedPriorities.length > 0) {
    const wanted = new Set(selectedPriorities);
    out = out.filter(
      (r) => r.triagePriority != null && wanted.has(r.triagePriority),
    );
  }
  if (selectedResponsibleIds.length > 0) {
    const wanted = new Set(selectedResponsibleIds);
    out = out.filter(
      (r) => r.responsibleId != null && wanted.has(r.responsibleId),
    );
  }
  if (councilReferralUrbanIds) {
    out = out.filter((r) => councilReferralUrbanIds.has(r.id));
  }
  return out;
}

function initialQueueTab(params: URLSearchParams): ReportQueueTab {
  const fromUrl = parseReportsQueueTabFromSearchParams(params);
  if (fromUrl) return fromUrl;
  if (
    parseCommissionIdsFromSearchParams(params).length > 0
    || parseCouncilReferralFilterFromSearchParams(params)
    || parseCouncilMemberIdsFromSearchParams(params).length > 0
  ) {
    return 'all';
  }
  return 'triage';
}

function manifestToUrbanRecord(
  m: UnifiedManifest,
  triagePriority: TriagePriority | null,
): UrbanReportRecord {
  const u = m.urban_data;
  return {
    id: m.id,
    protocol: u?.protocol_code ?? m.id.slice(0, 8).toUpperCase(),
    title: m.title,
    summary: m.description ?? '',
    category: u?.category ?? '—',
    region: formatUrbanReportRegionLabel({
      locationAddress: m.location,
      neighborhood: u?.neighborhood ?? null,
      latitude: u?.latitude ?? null,
      longitude: u?.longitude ?? null,
    }),
    district: u?.neighborhood ?? '—',
    stage: 'awaiting_triage',
    triagePriority,
    createdAt: m.created_at,
    updatedAt: m.updated_at ?? m.created_at,
    timeline: [],
  };
}

/** Gestão de relatos urbanos — dados reais via `useReportsAdmin`. */
const MANAGEMENT_FETCH_CAP = 500;

export function useUrbanReportsManagement() {
  const [searchParams] = useSearchParams();
  const { period, region, category, periodCompare, compareActive } = useGlobalFilters();
  const {
    manifests,
    loading,
    setTypeFilter,
    setCategoryFilter,
    setRegionFilter,
    setDateRange,
    setPage,
    updateManifestStatus,
    refetch,
    lastDataUpdate,
  } = useReportsAdmin({ fetchCap: MANAGEMENT_FETCH_CAP });

  useRegisterAnalyticsLive('reports-management', {
    lastUpdate: lastDataUpdate,
    refresh: refetch,
  });
  const [overrides, setOverrides] = useState<Record<string, UrbanReportRecord>>({});
  const [queueTab, setQueueTab] = useState<ReportQueueTab>(() =>
    initialQueueTab(searchParams),
  );
  const [stageFilter, setStageFilter] = useState<ReportsStageFilter | null>(null);
  const [listPage, setListPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState<TriagePriority[]>([]);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [selectedResponsibleIds, setSelectedResponsibleIds] = useState<string[]>(() =>
    parseCommissionIdsFromSearchParams(searchParams),
  );
  const [responsiblePopoverOpen, setResponsiblePopoverOpen] = useState(false);

  useEffect(() => {
    const fromUrl = parseCommissionIdsFromSearchParams(searchParams);
    if (fromUrl.length > 0) {
      setSelectedResponsibleIds(fromUrl);
      const tabFromUrl = parseReportsQueueTabFromSearchParams(searchParams);
      setQueueTab(tabFromUrl ?? 'all');
      setStageFilter(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const councillorIds = parseCouncilMemberIdsFromSearchParams(searchParams);
    const councilFilter =
      parseCouncilReferralFilterFromSearchParams(searchParams)
      ?? (councillorIds.length > 0 ? 'any' : null);

    if (!councilFilter) {
      setCouncilReferralUrbanIds(null);
      setCouncilReferralFilter(null);
      setCouncilReferralRows([]);
      setCouncilReferralFilterLabel(null);
      setCouncilReferralDrilldownManifests([]);
      setCouncilReferralStats(null);
      return;
    }

    setCouncilReferralFilter(councilFilter);

    const labels: Record<CouncilReferralFilter, string> = {
      any: 'Encaminhamento a vereador',
      pending: 'Encaminhamento pendente',
      sent: 'Encaminhamento enviado',
      acknowledged: 'Encaminhamento reconhecido',
      resolved: 'Encaminhamento resolvido',
    };
    const baseLabel = labels[councilFilter];

    const periodCompareInput =
      period === PERIOD_COMPARE_VALUE && compareActive
        ? { periodA: periodCompare.periodA }
        : undefined;

    let cancelled = false;
    void fetchFilteredCouncilMemberReferrals(
      period,
      region,
      category,
      periodCompareInput,
    ).then((rows) => {
      if (cancelled) return;
      const scopedRows =
        councillorIds.length > 0
          ? rows.filter((r) => councillorIds.includes(r.councilMemberId))
          : rows;
      setCouncilReferralRows(scopedRows);
      const urbanIds = buildUrbanIdsForCouncilReferralFilter(scopedRows, councilFilter);
      setCouncilReferralUrbanIds(urbanIds);
      const matched = filterCouncilReferralRows(scopedRows, councilFilter);
      const councillorName =
        councillorIds.length === 1
          ? matched.find((r) => r.councilMemberId === councillorIds[0])?.councilMemberName
          : null;
      setCouncilReferralFilterLabel(
        councillorName ? `${baseLabel} · ${councillorName}` : baseLabel,
      );
      setCouncilReferralStats({
        referralTotal: matched.length,
        urbanLinked: matched.filter((r) => r.urbanReportId).length,
        nonUrban: countNonUrbanCouncilReferrals(matched),
      });
    }).catch((err) => {
      console.error('[useUrbanReportsManagement] council referral filter', err);
      if (!cancelled) {
        setCouncilReferralUrbanIds(new Set());
        setCouncilReferralRows([]);
        setCouncilReferralStats(null);
      }
    });

    const tabFromUrl = parseReportsQueueTabFromSearchParams(searchParams);
    setQueueTab(tabFromUrl ?? 'all');
    setStageFilter(null);

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    period,
    region,
    category,
    compareActive,
    periodCompare.periodA,
  ]);
  const [responsibleCatalog, setResponsibleCatalog] = useState<LegislativeCommissionOption[]>([]);
  const commissionNameCatalog = useMemo(
    () => new Map(responsibleCatalog.map((c) => [c.commissionId, c.name])),
    [responsibleCatalog],
  );
  const commissionNameCatalogRef = useRef(commissionNameCatalog);
  commissionNameCatalogRef.current = commissionNameCatalog;
  const referralLoadTokenRef = useRef(0);
  const referralReloadChainRef = useRef(Promise.resolve());
  const reportIdsKeyRef = useRef('');
  const councilReferralByReportIdRef = useRef(
    new Map<string, UrbanCouncilReferralSnapshot>(),
  );
  const [commissionByReportId, setCommissionByReportId] = useState<
    Map<string, { id: string; name: string }>
  >(new Map());
  const [councilReferralByReportId, setCouncilReferralByReportId] = useState(
    () => new Map<string, UrbanCouncilReferralSnapshot>(),
  );
  councilReferralByReportIdRef.current = councilReferralByReportId;
  const [triageCommissionByReportId, setTriageCommissionByReportId] = useState<
    Map<string, { id: string; name: string }>
  >(new Map());
  const [manifestById, setManifestById] = useState<Map<string, UnifiedManifest>>(new Map());
  const [triagePriorityByReportId, setTriagePriorityByReportId] = useState<
    Map<string, TriagePriority | null>
  >(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [councilReferralUrbanIds, setCouncilReferralUrbanIds] = useState<Set<string> | null>(
    null,
  );
  const [councilReferralFilter, setCouncilReferralFilter] =
    useState<CouncilReferralFilter | null>(null);
  const [councilReferralRows, setCouncilReferralRows] = useState<
    FilteredCouncilReferralRow[]
  >([]);
  const [councilReferralFilterLabel, setCouncilReferralFilterLabel] = useState<string | null>(
    null,
  );
  const [councilReferralDrilldownManifests, setCouncilReferralDrilldownManifests] = useState<
    UnifiedManifest[]
  >([]);
  const [councilReferralStats, setCouncilReferralStats] = useState<{
    referralTotal: number;
    urbanLinked: number;
    nonUrban: number;
  } | null>(null);

  useEffect(() => {
    setTypeFilter('urban');
  }, [setTypeFilter]);

  useEffect(() => {
    setCategoryFilter(category === 'all' ? 'all' : category);
  }, [category, setCategoryFilter]);

  useEffect(() => {
    setRegionFilter(region === 'all' ? 'all' : region);
  }, [region, setRegionFilter]);

  useEffect(() => {
    if (period === PERIOD_COMPARE_VALUE && compareActive && periodCompare.periodA?.from && periodCompare.periodA?.to) {
      setDateRange({ from: periodCompare.periodA.from, to: periodCompare.periodA.to });
      return;
    }
    const { from, to } = globalPeriodKeyToDateRange(period);
    setDateRange({ from, to });
  }, [period, periodCompare.periodA, compareActive, setDateRange]);

  useEffect(() => {
    setPage(1);
  }, [period, region, category, setPage]);

  useEffect(() => {
    void (async () => {
      try {
        const list = await fetchActiveLegislativeCommissions();
        setResponsibleCatalog(list);
      } catch (err) {
        console.error('[useUrbanReportsManagement] commissions catalog', err);
      }
    })();
  }, []);

  useEffect(() => {
    const urban = manifests.filter((m) => m.type === 'urban');
    const merged = new Map(urban.map((m) => [m.id, m]));
    for (const m of councilReferralDrilldownManifests) {
      merged.set(m.id, m);
    }
    setManifestById(merged);
  }, [manifests, councilReferralDrilldownManifests]);

  useEffect(() => {
    if (!councilReferralFilter || !councilReferralUrbanIds || councilReferralUrbanIds.size === 0) {
      setCouncilReferralDrilldownManifests([]);
      return;
    }
    const ids = [...councilReferralUrbanIds];
    let cancelled = false;
    void fetchUrbanManifestsForCouncilReferralIds(ids, region, category, {
      trustReferralRecorte: true,
    })
      .then((rows) => {
        if (!cancelled) setCouncilReferralDrilldownManifests(rows);
      })
      .catch((err) => {
        console.error('[useUrbanReportsManagement] referral drilldown fetch', err);
        if (!cancelled) setCouncilReferralDrilldownManifests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [councilReferralFilter, councilReferralUrbanIds, region, category]);

  const baseReports = useMemo(() => {
    return [...manifestById.values()].map((m) => {
      const formal = triagePriorityByReportId.get(m.id) ?? null;
      const triagePriority = effectiveReportTriagePriority(
        formal,
        m.severity ?? null,
      );
      return manifestToUrbanRecord(m, triagePriority);
    });
  }, [manifestById, triagePriorityByReportId]);

  const reportIdsKey = useMemo(
    () => baseReports.map((r) => r.id).sort().join(','),
    [baseReports],
  );
  reportIdsKeyRef.current = reportIdsKey;

  const reloadReferralMapsInner = useCallback(
    async (ids: string[], options?: { merge?: boolean }) => {
      const merge = options?.merge ?? false;

      if (ids.length === 0) {
        if (!merge) {
          setCommissionByReportId(new Map());
          setCouncilReferralByReportId(new Map());
          setTriageCommissionByReportId(new Map());
          setTriagePriorityByReportId(new Map());
        }
        return;
      }

      const token = merge ? null : ++referralLoadTokenRef.current;
      const catalog = commissionNameCatalogRef.current;
      const byId = new Map<string, { id: string; name: string }>();
      const councilMap = new Map<string, UrbanCouncilReferralSnapshot>();
      const triageCommMap = new Map<string, { id: string; name: string }>();
      const triageMap = new Map<string, TriagePriority | null>();

      for (const chunk of chunkIds(ids, 80)) {
        if (token !== null && token !== referralLoadTokenRef.current) return;

        const [byKey, chunkTriage, chunkCouncil, chunkTriageComm] = await Promise.all([
          loadLatestCommissionByReportKey(chunk, []),
          loadUrbanTriagePriorityByReportId(chunk),
          loadLatestCouncilReferralByUrbanIds(chunk),
          loadUrbanTriageResponsibleCommissionByReportIds(chunk),
        ]);

        if (token !== null && token !== referralLoadTokenRef.current) return;

        for (const id of chunk) {
          const ref = byKey.get(reportCommissionKey('urban_reports', id));
          if (ref) byId.set(id, { id: ref.commissionId, name: ref.commissionName });
        }
        for (const [id, pri] of chunkTriage) triageMap.set(id, pri);
        for (const [id, snap] of chunkCouncil) {
          if (!councilMap.has(id)) councilMap.set(id, snap);
        }
        for (const [id, ref] of chunkTriageComm) triageCommMap.set(id, ref);
      }

      if (token !== null && token !== referralLoadTokenRef.current) return;

      const triageCommEnriched = new Map<string, { id: string; name: string }>();
      for (const [id, ref] of triageCommMap) {
        const name = resolveCommissionDisplayName(ref.id, ref.name, catalog) ?? ref.name;
        triageCommEnriched.set(id, { id: ref.id, name });
      }

      const enrichedCommission = enrichCommissionByReportId(byId, catalog);
      const enrichedCouncil = enrichCouncilReferralMap(councilMap, catalog);

      if (merge) {
        setCommissionByReportId((prev) => {
          const next = new Map(prev);
          for (const [id, ref] of enrichedCommission) next.set(id, ref);
          return next;
        });
        setCouncilReferralByReportId((prev) => {
          const next = new Map(prev);
          for (const [id, snap] of enrichedCouncil) next.set(id, snap);
          return next;
        });
        setTriageCommissionByReportId((prev) => {
          const next = new Map(prev);
          for (const [id, ref] of triageCommEnriched) next.set(id, ref);
          return next;
        });
        setTriagePriorityByReportId((prev) => {
          const next = new Map(prev);
          for (const [id, pri] of triageMap) next.set(id, pri);
          return next;
        });
      } else {
        setCommissionByReportId(enrichedCommission);
        setCouncilReferralByReportId(enrichedCouncil);
        setTriageCommissionByReportId(triageCommEnriched);
        setTriagePriorityByReportId(triageMap);
      }
    },
    [],
  );

  const reloadReferralMaps = useCallback(
    (ids: string[], options?: { merge?: boolean }) => {
      const run = () => reloadReferralMapsInner(ids, options);
      const next = referralReloadChainRef.current.then(run, run);
      referralReloadChainRef.current = next.catch(() => undefined);
      return next;
    },
    [reloadReferralMapsInner],
  );

  useEffect(() => {
    const ids = reportIdsKey ? reportIdsKey.split(',') : [];
    void reloadReferralMaps(ids, { merge: false }).catch((err) => {
      console.error('[useUrbanReportsManagement] referrals / triage', err);
    });
  }, [reportIdsKey, reloadReferralMaps]);

  const reportsWithResponsible = useMemo(() => {
    return baseReports.map((r) => {
      const resolved = resolveUrbanReportResponsible(
        r.id,
        commissionByReportId,
        councilReferralByReportId,
        triageCommissionByReportId,
        commissionNameCatalog,
      );
      const manifest = manifestById.get(r.id);
      const stage = deriveUrbanWorkflowStage({
        dbStatus: manifest?.status,
        formalTriagePriority: triagePriorityByReportId.get(r.id) ?? null,
        hasCommissionReferral: commissionByReportId.has(r.id),
        hasCouncilReferral: councilReferralByReportId.has(r.id),
      });
      return {
        ...r,
        stage,
        responsibleId: resolved.responsibleId,
        responsibleName: resolved.responsibleName,
        councilMemberName: resolved.councilMemberName,
        referral: r.referral ?? resolved.referral,
      };
    });
  }, [
    baseReports,
    manifestById,
    triagePriorityByReportId,
    commissionByReportId,
    councilReferralByReportId,
    triageCommissionByReportId,
    commissionNameCatalog,
  ]);

  const reports = useMemo(
    () => reportsWithResponsible.map((r) => overrides[r.id] ?? r),
    [reportsWithResponsible, overrides],
  );

  const reportsById = useMemo(
    () => new Map(reports.map((r) => [r.id, r])),
    [reports],
  );

  const councilReferralScoped = useMemo(() => {
    if (!councilReferralFilter || councilReferralRows.length === 0) return null;
    const matched = filterCouncilReferralRows(councilReferralRows, councilReferralFilter);
    return buildUrbanReportRowsFromCouncilReferrals(matched, reportsById);
  }, [councilReferralFilter, councilReferralRows, reportsById]);

  const scopedReports = useMemo(() => {
    if (councilReferralScoped) {
      return applyLocalReportFilters(
        councilReferralScoped,
        search,
        selectedPriorities,
        selectedResponsibleIds,
        null,
      );
    }
    return applyLocalReportFilters(
      reports,
      search,
      selectedPriorities,
      selectedResponsibleIds,
      councilReferralUrbanIds,
    );
  }, [
    councilReferralScoped,
    reports,
    search,
    selectedPriorities,
    selectedResponsibleIds,
    councilReferralUrbanIds,
  ]);

  const counts = useMemo(() => countByStage(scopedReports), [scopedReports]);

  const filtered = useMemo(() => {
    if (councilReferralScoped) {
      return scopedReports;
    }
    return filterReportsForQueue(scopedReports, queueTab, stageFilter);
  }, [scopedReports, queueTab, stageFilter, councilReferralScoped]);

  const totalFiltered = filtered.length;
  const totalListPages = Math.max(1, Math.ceil(totalFiltered / REPORTS_LIST_PAGE_SIZE));

  const paginatedFiltered = useMemo(() => {
    const safePage = Math.min(listPage, totalListPages);
    const start = (safePage - 1) * REPORTS_LIST_PAGE_SIZE;
    return filtered.slice(start, start + REPORTS_LIST_PAGE_SIZE);
  }, [filtered, listPage, totalListPages]);

  useEffect(() => {
    setListPage(1);
  }, [queueTab, stageFilter, search, selectedPriorities, selectedResponsibleIds, councilReferralUrbanIds]);

  useEffect(() => {
    if (listPage > totalListPages) {
      setListPage(totalListPages);
    }
  }, [listPage, totalListPages]);

  const selectWorkflowKpi = useCallback((tab: ReportQueueTab) => {
    setQueueTab(tab);
    switch (tab) {
      case 'triage':
        setStageFilter('awaiting_triage');
        break;
      case 'tracking':
        setStageFilter('triaged');
        break;
      case 'referrals':
        setStageFilter('in_referral');
        break;
      case 'all':
        setStageFilter('resolved');
        break;
      default:
        setStageFilter(null);
    }
  }, []);

  const onQueueTabChange = useCallback((tab: ReportQueueTab) => {
    setQueueTab(tab);
    setStageFilter(null);
  }, []);

  const activeKpiTab = useMemo((): ReportQueueTab | null => {
    if (!stageFilter) return null;
    return queueTabForStageFilter(stageFilter);
  }, [stageFilter]);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const toggleResponsible = useCallback((commissionId: string) => {
    setSelectedResponsibleIds((prev) => {
      const exists = prev.includes(commissionId);
      const next = exists
        ? prev.filter((id) => id !== commissionId)
        : [...prev, commissionId];
      return next.sort((a, b) => {
        const nameA = responsibleCatalog.find((c) => c.commissionId === a)?.name ?? a;
        const nameB = responsibleCatalog.find((c) => c.commissionId === b)?.name ?? b;
        return nameA.localeCompare(nameB, 'pt-BR');
      });
    });
  }, [responsibleCatalog]);

  const togglePriority = useCallback((priority: TriagePriority) => {
    setSelectedPriorities((prev) => {
      const next = prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority];
      return sortPriorities(next);
    });
  }, []);

  const clearPriorityFilter = useCallback(() => {
    setSelectedPriorities([]);
  }, []);

  const clearResponsibleFilter = useCallback(() => {
    setSelectedResponsibleIds([]);
  }, []);

  const updateReport = useCallback(
    async (updated: UrbanReportRecord) => {
      const previous =
        overrides[updated.id] ?? baseReports.find((r) => r.id === updated.id) ?? null;
      const dbStatus = stageToDbStatus(updated.stage);

      let patched = updated;
      if (updated.referral) {
        const commissionName =
          resolveCommissionDisplayName(
            updated.referral.commissionId,
            updated.referral.commissionName,
            commissionNameCatalog,
          ) ?? updated.referral.commissionName;
        patched = {
          ...updated,
          responsibleId: updated.referral.commissionId,
          responsibleName: commissionName,
          referral: { ...updated.referral, commissionName },
        };
      }

      setOverrides((prev) => ({
        ...prev,
        [updated.id]: { ...patched, updatedAt: new Date().toISOString() },
      }));
      setSavingId(updated.id);

      try {
        if (patched.referral) {
          await persistUrbanManagementReferral({
            urbanReportId: patched.id,
            commissionId: patched.referral.commissionId,
            commissionName: patched.referral.commissionName,
            councillorId: patched.referral.councillorId,
            councillorName: patched.referral.councillorName,
            matchScore: patched.referral.matchScore,
            note: patched.referral.note,
            existingCouncilReferralId: patched.referral.councilReferralId,
          });
        }
        await updateManifestStatus(patched.id, 'urban', dbStatus);

        if (patched.referral) {
          const { councilPatch, commissionPatch } = patchReferralMapsForReport(
            patched.id,
            patched.referral,
            commissionNameCatalogRef.current,
          );
          setCouncilReferralByReportId((prev) => {
            const next = new Map(prev);
            next.set(patched.id, councilPatch);
            return next;
          });
          setCommissionByReportId((prev) => {
            const next = new Map(prev);
            next.set(patched.id, commissionPatch);
            return next;
          });
          setTriageCommissionByReportId((prev) => {
            const next = new Map(prev);
            next.set(patched.id, {
              id: patched.referral!.commissionId,
              name: patched.referral!.commissionName,
            });
            return next;
          });
        }

        await reloadReferralMaps([patched.id], { merge: true });

        setOverrides((prev) => {
          const next = { ...prev };
          delete next[patched.id];
          return next;
        });
      } catch {
        if (previous) {
          setOverrides((prev) => ({ ...prev, [updated.id]: previous }));
        } else {
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[updated.id];
            return next;
          });
        }
        toast.error('Não foi possível salvar a alteração no relato.');
        throw new Error('update_failed');
      } finally {
        setSavingId(null);
      }
    },
    [baseReports, overrides, updateManifestStatus, reloadReferralMaps],
  );

  const onTriageCommitted = useCallback(
    async (reportId: string, saved: TriageRecord) => {
      const catalog = commissionNameCatalogRef.current;

      setTriagePriorityByReportId((prev) => {
        const next = new Map(prev);
        next.set(reportId, saved.priority);
        return next;
      });

      if (saved.responsibleCommissionId) {
        const commissionName =
          resolveCommissionDisplayName(saved.responsibleCommissionId, null, catalog)
          ?? catalog.get(saved.responsibleCommissionId)
          ?? 'Comissão';
        setTriageCommissionByReportId((prev) => {
          const next = new Map(prev);
          next.set(reportId, { id: saved.responsibleCommissionId!, name: commissionName });
          return next;
        });

        const hadCouncilReferral = councilReferralByReportIdRef.current.has(reportId);
        if (hadCouncilReferral) {
          setCouncilReferralByReportId((prev) => {
            const existing = prev.get(reportId);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(reportId, {
              ...existing,
              commissionId: saved.responsibleCommissionId,
              commissionName,
            });
            return next;
          });
          setCommissionByReportId((prev) => {
            const next = new Map(prev);
            next.set(reportId, { id: saved.responsibleCommissionId!, name: commissionName });
            return next;
          });
          try {
            await syncReferralCommissionFromTriage(
              reportId,
              saved.responsibleCommissionId,
              commissionName,
            );
          } catch (err) {
            console.warn('[useUrbanReportsManagement] sync triage → referral', err);
            toast.error('Triagem salva, mas não foi possível alinhar o encaminhamento.');
          }
        }
      } else {
        setTriageCommissionByReportId((prev) => {
          const next = new Map(prev);
          next.delete(reportId);
          return next;
        });
      }

      if (saved.priority && saved.triageStatus !== 'untriaged') {
        try {
          await updateManifestStatus(reportId, 'urban', 'in_progress');
        } catch {
          /* toast já exibido por updateManifestStatus */
        }
      }

      await reloadReferralMaps([reportId], { merge: true });
    },
    [updateManifestStatus, reloadReferralMaps],
  );

  return {
    reports,
    filtered,
    paginatedFiltered,
    totalFiltered,
    listPage,
    setListPage,
    totalListPages,
    counts,
    queueTab,
    setQueueTab: onQueueTabChange,
    selectWorkflowKpi,
    activeKpiTab,
    search,
    setSearch,
    selected,
    selectedId,
    setSelectedId,
    updateReport,
    savingId,
    onTriageCommitted,
    isLoading: loading,
    error: null as string | null,
    period,
    selectedPriorities,
    priorityPopoverOpen,
    setPriorityPopoverOpen,
    togglePriority,
    clearPriorityFilter,
    responsibleCatalog,
    selectedResponsibleIds,
    responsiblePopoverOpen,
    setResponsiblePopoverOpen,
    toggleResponsible,
    clearResponsibleFilter,
    councilReferralFilterLabel,
    councilReferralStats,
  };
}
