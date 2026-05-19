import { useEffect, useMemo, useState } from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { countByStage } from '@/lib/urbanReportLabels';
import { useReportsAdmin, type UnifiedManifest } from '@/hooks/useReportsAdmin';
import type { ReportQueueTab, ReportWorkflowStage, UrbanReportRecord } from '@/types/urbanReportManagement';

function mapStatusToStage(status: string): ReportWorkflowStage {
  switch (status) {
    case 'pending':
      return 'awaiting_triage';
    case 'triaged':
      return 'triaged';
    case 'referred':
      return 'referred';
    case 'in_analysis':
    case 'in_progress':
      return 'in_analysis';
    case 'resolved':
    case 'closed':
      return 'resolved';
    default:
      return 'awaiting_triage';
  }
}

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
    stage: mapStatusToStage(m.status),
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
  } = useReportsAdmin();
  const [overrides, setOverrides] = useState<Record<string, UrbanReportRecord>>({});
  const [queueTab, setQueueTab] = useState<ReportQueueTab>('triage');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const updateReport = (updated: UrbanReportRecord) => {
    setOverrides((prev) => ({ ...prev, [updated.id]: updated }));
  };

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
    isLoading: loading,
    error: null as string | null,
    period,
  };
}
