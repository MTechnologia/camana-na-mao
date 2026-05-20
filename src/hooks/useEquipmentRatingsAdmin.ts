import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useDebounce } from '@/hooks/useDebounce';

export type EquipmentRatingRow = {
  id: string;
  rating_stars: number;
  rating_text: string | null;
  sentiment: string | null;
  publication_status: string;
  wait_time_score: number | null;
  created_at: string;
  is_anonymous: boolean | null;
  service_id: string;
  service_name: string;
  service_type: string | null;
  district: string | null;
  author_name: string | null;
};

export type EquipmentRatingsKpis = {
  total: number;
  pendingModeration: number;
  avgWaitScore: number | null;
};

const LIST_FIELDS =
  'id, rating_stars, rating_text, sentiment, publication_status, wait_time_score, created_at, is_anonymous, service_id, user_id, public_services(name, service_type, district)';

export function useEquipmentRatingsAdmin() {
  const { period, region, category } = useGlobalFilters();
  const dateFilters = globalFiltersToReportsAnalytics(period, region, category);

  const [rows, setRows] = useState<EquipmentRatingRow[]>([]);
  const [kpis, setKpis] = useState<EquipmentRatingsKpis>({
    total: 0,
    pendingModeration: 0,
    avgWaitScore: null,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('service_ratings')
        .select(LIST_FIELDS)
        .order('created_at', { ascending: false })
        .limit(200);

      if (dateFilters.startDate) q = q.gte('created_at', `${dateFilters.startDate}T00:00:00`);
      if (dateFilters.endDate) q = q.lte('created_at', `${dateFilters.endDate}T23:59:59`);

      const { data, error } = await q;
      if (error) throw error;

      let mapped: EquipmentRatingRow[] = (data ?? []).map((r) => {
        const svc = r.public_services as {
          name?: string;
          service_type?: string;
          district?: string;
        } | null;
        return {
          id: r.id,
          rating_stars: r.rating_stars,
          rating_text: r.rating_text,
          sentiment: r.sentiment,
          publication_status: r.publication_status,
          wait_time_score: r.wait_time_score,
          created_at: r.created_at ?? '',
          is_anonymous: r.is_anonymous,
          service_id: r.service_id,
          service_name: svc?.name ?? 'Equipamento',
          service_type: svc?.service_type ?? null,
          district: svc?.district ?? null,
          author_name: null,
        };
      });

      if (region !== 'all') {
        mapped = mapped.filter(
          (r) => r.district?.toLowerCase().includes(region) || r.district === region,
        );
      }

      const rawRows = data ?? [];
      const userIds = [...new Set(rawRows.map((r) => r.user_id as string).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
        const authorById = new Map(
          rawRows.map((r) => [
            r.id as string,
            r.is_anonymous ? 'Anônimo' : profileMap.get(r.user_id as string) ?? null,
          ]),
        );
        mapped = mapped.map((row) => ({
          ...row,
          author_name: authorById.get(row.id) ?? null,
        }));
      }

      const pending = mapped.filter((r) => r.publication_status === 'pending_review').length;
      const waitScores = mapped
        .map((r) => r.wait_time_score)
        .filter((w): w is number => w != null);
      const avgWait =
        waitScores.length > 0
          ? Math.round((waitScores.reduce((a, b) => a + b, 0) / waitScores.length) * 10) / 10
          : null;

      setKpis({ total: mapped.length, pendingModeration: pending, avgWaitScore: avgWait });
      setRows(mapped);
    } catch (e) {
      console.error('[useEquipmentRatingsAdmin]', e);
      setRows([]);
      setKpis({ total: 0, pendingModeration: 0, avgWaitScore: null });
    } finally {
      setLoading(false);
    }
  }, [dateFilters.endDate, dateFilters.startDate, region]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = debouncedSearch.trim()
    ? rows.filter((r) => {
        const q = debouncedSearch.trim().toLowerCase();
        return (
          r.service_name.toLowerCase().includes(q) ||
          (r.rating_text?.toLowerCase().includes(q) ?? false) ||
          (r.district?.toLowerCase().includes(q) ?? false)
        );
      })
    : rows;

  const moderate = async (id: string, status: 'published' | 'rejected') => {
    const { error } = await supabase
      .from('service_ratings')
      .update({ publication_status: status })
      .eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  return {
    rows: filtered,
    kpis,
    loading,
    search,
    setSearch,
    refresh: fetchData,
    moderate,
  };
}
