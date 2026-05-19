import { supabase } from '@/integrations/supabase/client';
import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import { bairroParaZona } from '@/lib/regionMapping';
import type { ChartBarPoint, DrillReportRow } from '@/types/analyticsDrill';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  triaged: 'Triado',
  referred: 'Encaminhado',
  in_analysis: 'Em análise',
  in_progress: 'Em análise',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};

export async function fetchDrillThroughReports(
  filters: ReportsAnalyticsFilters,
  bar: ChartBarPoint,
): Promise<DrillReportRow[]> {
  let query = supabase
    .from('urban_reports')
    .select('id, description, status, created_at, category, neighborhood')
    .neq('category', 'feedback_camara')
    .order('created_at', { ascending: false })
    .limit(12);

  if (filters.startDate) query = query.gte('created_at', `${filters.startDate}T00:00:00`);
  if (filters.endDate) query = query.lte('created_at', `${filters.endDate}T23:59:59`);
  if (bar.filterKey === 'category') query = query.eq('category', bar.filterValue);
  if (filters.category) query = query.eq('category', filters.category);

  const { data, error } = await query;
  if (error) {
    console.warn('[fetchDrillThroughReports]', error.message);
    return [];
  }

  let rows = data ?? [];

  if (bar.filterKey === 'region') {
    rows = rows.filter((r) => (bairroParaZona(r.neighborhood ?? '') ?? '') === bar.label);
  }
  if (bar.filterKey === 'district') {
    rows = rows.filter((r) => r.neighborhood === bar.filterValue);
  }

  const limit = Math.min(8, Math.max(3, Math.ceil(bar.value / 80)));
  return rows.slice(0, limit).map((r) => ({
    id: r.id,
    title: (r.description ?? r.category ?? 'Relato urbano').slice(0, 80),
    status: STATUS_LABELS[r.status ?? ''] ?? r.status ?? '—',
    createdAt: new Date(r.created_at ?? '').toLocaleDateString('pt-BR'),
  }));
}
