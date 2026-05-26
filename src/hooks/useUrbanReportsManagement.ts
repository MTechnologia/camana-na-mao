import { useCallback, useEffect, useMemo, useState } from 'react';
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
  dbStatusToWorkflowStage,
  stageToDbStatus,
} from '@/lib/urbanReportPersistence';
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
    stage: dbStatusToWorkflowStage(m.status),
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
  const [commissionByReportId, setCommissionByReportId] = useState<
    Map<string, { id: string; name: string }>
  >(new Map());
  const [councilReferralByReportId, setCouncilReferralByReportId] = useState(
    () => new Map<string, UrbanCouncilReferralSnapshot>(),
  );
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
        m.n8n_priority ?? null,
        m.severity ?? null,
      );
      return manifestToUrbanRecord(m, triagePriority);
    });
  }, [manifestById, triagePriorityByReportId]);

  const reportIdsKey = useMemo(
    () => baseReports.map((r) => r.id).sort().join(','),
    [baseReports],
  );

  useEffect(() => {
    const ids = reportIdsKey ? reportIdsKey.split(',') : [];
    if (ids.length === 0) {
      setCommissionByReportId(new Map());
      setCouncilReferralByReportId(new Map());
      setTriageCommissionByReportId(new Map());
      setTriagePriorityByReportId(new Map());
      return;
    }
    void (async () => {
      try {
        const [byKey, triageMap, councilMap, triageCommMap] = await Promise.all([
          loadLatestCommissionByReportKey(ids, []),
          loadUrbanTriagePriorityByReportId(ids),
          loadLatestCouncilReferralByUrbanIds(ids),
          loadUrbanTriageResponsibleCommissionByReportIds(ids),
        ]);
        const byId = new Map<string, { id: string; name: string }>();
        for (const id of ids) {
          const ref = byKey.get(reportCommissionKey('urban_reports', id));
          if (ref) byId.set(id, { id: ref.commissionId, name: ref.commissionName });
        }
        setCommissionByReportId(byId);
        setCouncilReferralByReportId(councilMap);
        setTriageCommissionByReportId(triageCommMap);
        setTriagePriorityByReportId(triageMap);
      } catch (err) {
        console.error('[useUrbanReportsManagement] referrals / triage', err);
      }
    })();
  }, [reportIdsKey]);

  const reportsWithResponsible = useMemo(() => {
    return baseReports.map((r) => {
      const resolved = resolveUrbanReportResponsible(
        r.id,
        commissionByReportId,
        councilReferralByReportId,
        triageCommissionByReportId,
      );
      return {
        ...r,
        responsibleId: resolved.responsibleId,
        responsibleName: resolved.responsibleName,
        councilMemberName: resolved.councilMemberName,
        referral: r.referral ?? resolved.referral,
      };
    });
  }, [baseReports, commissionByReportId, councilReferralByReportId, triageCommissionByReportId]);

  useEffect(() => {
    setResponsibleCatalog((prev) => {
      const map = new Map(prev.map((e) => [e.commissionId, e]));
      for (const r of reportsWithResponsible) {
        if (r.responsibleId && r.responsibleName) {
          const existing = map.get(r.responsibleId);
          map.set(r.responsibleId, {
            commissionId: r.responsibleId,
            name: r.responsibleName,
            code: existing?.code ?? null,
          });
        }
      }
      return [...map.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      );
    });
  }, [reportsWithResponsible]);

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
    let list = scopedReports;
    if (councilReferralScoped) {
      return list;
    }
    switch (queueTab) {
      case 'triage':
        return list.filter((r) => r.stage === 'awaiting_triage');
      case 'referrals':
        return list.filter((r) => r.stage === 'referred' || r.stage === 'in_analysis');
      case 'tracking':
        return list.filter((r) => r.stage !== 'awaiting_triage');
      default:
        return list;
    }
  }, [scopedReports, queueTab, councilReferralScoped]);

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

      setOverrides((prev) => ({
        ...prev,
        [updated.id]: { ...updated, updatedAt: new Date().toISOString() },
      }));
      setSavingId(updated.id);

      try {
        if (updated.referral) {
          await persistUrbanManagementReferral({
            urbanReportId: updated.id,
            commissionId: updated.referral.commissionId,
            commissionName: updated.referral.commissionName,
            councillorId: updated.referral.councillorId,
            councillorName: updated.referral.councillorName,
            matchScore: updated.referral.matchScore,
            note: updated.referral.note,
          });
        }
        await updateManifestStatus(updated.id, 'urban', dbStatus);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[updated.id];
          return next;
        });
        void refetch();
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
    [baseReports, overrides, updateManifestStatus, refetch],
  );

  const onTriageCommitted = useCallback(
    async (reportId: string, saved: TriageRecord) => {
      if (saved.priority && saved.triageStatus !== 'untriaged') {
        try {
          await updateManifestStatus(reportId, 'urban', 'in_progress');
        } catch {
          /* toast já exibido por updateManifestStatus */
        }
      }
      void refetch();
    },
    [updateManifestStatus, refetch],
  );

  return {
    reports,
    filtered,
    counts,
    queueTab,
    setQueueTab,
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
