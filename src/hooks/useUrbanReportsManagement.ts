import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { countByStage } from '@/lib/urbanReportLabels';
import {
  dbStatusToWorkflowStage,
  stageToDbStatus,
} from '@/lib/urbanReportPersistence';
import { useReportsAdmin, type UnifiedManifest } from '@/hooks/useReportsAdmin';
import { useRegisterAnalyticsLive } from '@/hooks/useRegisterAnalyticsLive';
import type {
  ReportQueueTab,
  UrbanReportRecord,
} from '@/types/urbanReportManagement';

function manifestToUrbanRecord(m: UnifiedManifest): UrbanReportRecord {
  const u = m.urban_data;
  return {
    id: m.id,
    protocol: u?.protocol_code ?? m.id.slice(0, 8).toUpperCase(),
    title: m.title,
    summary: m.description ?? '',
    category: u?.category ?? '—',
    region: m.location ?? u?.neighborhood ?? '—',
    district: u?.neighborhood ?? '—',
    stage: dbStatusToWorkflowStage(m.status),
    createdAt: m.created_at,
    updatedAt: m.updated_at ?? m.created_at,
    timeline: [],
  };
}

/** Gestão de relatos urbanos — dados reais via `useReportsAdmin`. */
export function useUrbanReportsManagement() {
  const { period, region, category } = useGlobalFilters();
  const {
    manifests,
    loading,
    setTypeFilter,
    setCategoryFilter,
    setRegionFilter,
    updateManifestStatus,
    refetch,
    lastDataUpdate,
  } = useReportsAdmin();

  useRegisterAnalyticsLive('reports-management', {
    lastUpdate: lastDataUpdate,
    refresh: refetch,
  });
  const [overrides, setOverrides] = useState<Record<string, UrbanReportRecord>>({});
  const [queueTab, setQueueTab] = useState<ReportQueueTab>('triage');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setTypeFilter('urban');
  }, [setTypeFilter]);

  useEffect(() => {
    setCategoryFilter(category === 'all' ? 'all' : category);
  }, [category, setCategoryFilter]);

  useEffect(() => {
    setRegionFilter(region === 'all' ? 'all' : region);
  }, [region, setRegionFilter]);

  const baseReports = useMemo(() => {
    const urban = manifests.filter((m) => m.type === 'urban');
    return urban.map(manifestToUrbanRecord);
  }, [manifests]);

  const reports = useMemo(
    () => baseReports.map((r) => overrides[r.id] ?? r),
    [baseReports, overrides],
  );

  const counts = useMemo(() => countByStage(reports), [reports]);

  const filtered = useMemo(() => {
    let list = reports;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.protocol.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
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
  }, [reports, queueTab, search]);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

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
        await updateManifestStatus(updated.id, 'urban', dbStatus);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[updated.id];
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
    [baseReports, overrides, updateManifestStatus],
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
    isLoading: loading,
    error: null as string | null,
    period,
  };
};
