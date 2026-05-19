import { supabase } from '@/integrations/supabase/client';
import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import type { LabeledValue, SeriesPoint } from '@/lib/chartTypes';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { fetchCouncilMemberDestinations, fetchThematicCommissions } from '@/lib/referralDestinations';
import { bairroParaZona } from '@/lib/regionMapping';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  vereador: 'Vereador',
  assessor: 'Assessor',
  cidadao_engajado: 'Cidadão engajado',
  cidadao: 'Cidadão',
};

const CORRECTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  applied: 'Aplicada',
};

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendentes',
  sent: 'Enviados',
  acknowledged: 'Reconhecidos',
  resolved: 'Resolvidos',
};

function dateRangeFromFilters(period: string) {
  const f = globalFiltersToReportsAnalytics(period, 'all', 'all');
  return { start: f.startDate, end: f.endDate };
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function buildVolumeSeriesFromStats(stats: ReportsAnalyticsStats | null): SeriesPoint[] {
  if (!stats?.timeline?.length) return [];
  const resolvedByDate = new Map(
    stats.byStatus
      .filter((s) => s.status === 'resolved' || s.status === 'closed')
      .map(() => [] as string[]),
  );
  void resolvedByDate;
  const resolvedTotal = stats.byStatus.find((s) => s.status === 'resolved')?.count ?? 0;
  const ratio = stats.total > 0 ? resolvedTotal / stats.total : 0.3;

  return stats.timeline.map((p) => ({
    label: formatDayLabel(p.date),
    volume: p.total,
    resolved: Math.round(p.total * ratio),
  }));
}

export async function fetchSectionChartExtras(
  period: string,
  region: string,
  category: string,
): Promise<{
  classificationByCategory: LabeledValue[];
  classificationTrend: LabeledValue[];
  referralFunnel: LabeledValue[];
  referralTimeline: SeriesPoint[];
  commissionByTheme: LabeledValue[];
  councilMemberQueue: LabeledValue[];
  notificationStats: SeriesPoint[];
  exportActivity: { byFormat: LabeledValue[]; timeline: SeriesPoint[] };
  correctionsByStatus: LabeledValue[];
  widgetUsage: LabeledValue[];
  savedPanelsTrend: LabeledValue[];
  panelBuilderFunnel: LabeledValue[];
  accessibilityAdoption: LabeledValue[];
  moduleAccess: LabeledValue[];
  auditByDay: LabeledValue[];
  usersByRole: LabeledValue[];
  heatmapByTerritory: (metric: string) => LabeledValue[];
  metricTrends: SeriesPoint[];
}> {
  const { start, end } = dateRangeFromFilters(period);
  const startIso = start ? `${start}T00:00:00` : undefined;
  const endIso = end ? `${end}T23:59:59` : undefined;

  const [
    accuracyRes,
    referralsRes,
    exportRes,
    scheduledExportRes,
    auditRes,
    rolesRes,
    prefsRes,
    notifRes,
    dashboardsRes,
    correctionsRes,
    ratingsRes,
    commissions,
    council,
  ] = await Promise.all([
    supabase.from('v_classification_accuracy_by_source').select('*'),
    supabase
      .from('council_member_referrals')
      .select('status, created_at, resolved_at')
      .gte('created_at', startIso ?? '1970-01-01')
      .lte('created_at', endIso ?? '2099-12-31'),
    supabase
      .from('export_logs')
      .select('format, created_at')
      .gte('created_at', startIso ?? '1970-01-01')
      .lte('created_at', endIso ?? '2099-12-31'),
    supabase
      .from('scheduled_exports')
      .select('last_run_at')
      .not('last_run_at', 'is', null)
      .gte('last_run_at', startIso ?? '1970-01-01')
      .lte('last_run_at', endIso ?? '2099-12-31'),
    supabase
      .from('audit_logs')
      .select('created_at, entity_type')
      .gte('created_at', startIso ?? '1970-01-01')
      .lte('created_at', endIso ?? '2099-12-31'),
    supabase.from('user_roles').select('role'),
    supabase.from('user_preferences').select('font_size, reading_mode, text_spacing, theme'),
    supabase
      .from('notifications')
      .select('created_at, is_read, discarded_at')
      .gte('created_at', startIso ?? '1970-01-01')
      .lte('created_at', endIso ?? '2099-12-31'),
    supabase.from('dashboards').select('created_at, config'),
    supabase.from('service_corrections').select('status'),
    supabase
      .from('service_ratings')
      .select('wait_time_score, created_at, public_services(district)')
      .gte('created_at', startIso ?? '1970-01-01')
      .lte('created_at', endIso ?? '2099-12-31'),
    fetchThematicCommissions(),
    fetchCouncilMemberDestinations(),
  ]);

  const classificationByCategory: LabeledValue[] = (accuracyRes.data ?? []).map((r) => ({
    label:
      r.report_type === 'urban'
        ? 'Urbano'
        : r.report_type === 'transport'
          ? 'Transporte'
          : String(r.report_type ?? 'Outro'),
    value: Math.round(Number(r.category_accuracy_pct ?? 0)),
  }));

  const recent = (accuracyRes.data ?? []).slice(0, 8);
  const classificationTrend: LabeledValue[] = recent.map((r, i) => ({
    label: `Fonte ${i + 1}`,
    value: Math.round(Number(r.category_accuracy_pct ?? 0)),
  }));

  const referrals = referralsRes.data ?? [];
  const referralFunnel: LabeledValue[] = ['pending', 'sent', 'acknowledged', 'resolved'].map(
    (status) => ({
      label: REFERRAL_STATUS_LABELS[status] ?? status,
      value: referrals.filter((r) => r.status === status).length,
    }),
  );

  const dayMap = new Map<string, { criados: number; concluidos: number }>();
  for (const r of referrals) {
    const day = (r.created_at as string).slice(0, 10);
    const cur = dayMap.get(day) ?? { criados: 0, concluidos: 0 };
    cur.criados += 1;
    if (r.resolved_at) cur.concluidos += 1;
    dayMap.set(day, cur);
  }
  const referralTimeline: SeriesPoint[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([label, v]) => ({ label: formatDayLabel(label), ...v }));

  const commissionByTheme: LabeledValue[] = commissions
    .slice(0, 8)
    .map((c) => ({ label: c.name.slice(0, 28), value: c.activeReferrals }));

  const councilMemberQueue: LabeledValue[] = council
    .sort((a, b) => b.activeReferrals - a.activeReferrals)
    .slice(0, 8)
    .map((c) => ({ label: c.name.split(' (')[0].slice(0, 22), value: c.activeReferrals }));

  const notifDay = new Map<string, { enviadas: number; entregues: number; falhas: number }>();
  for (const n of notifRes.data ?? []) {
    const day = (n.created_at as string).slice(0, 10);
    const cur = notifDay.get(day) ?? { enviadas: 0, entregues: 0, falhas: 0 };
    cur.enviadas += 1;
    if (n.is_read) cur.entregues += 1;
    if (n.discarded_at) cur.falhas += 1;
    notifDay.set(day, cur);
  }
  const notificationStats: SeriesPoint[] = [...notifDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([label, v]) => ({ label: formatDayLabel(label), ...v }));

  const formatCounts = new Map<string, number>();
  for (const e of exportRes.data ?? []) {
    const fmt = String(e.format ?? 'outro').toUpperCase();
    formatCounts.set(fmt, (formatCounts.get(fmt) ?? 0) + 1);
  }

  const now = new Date();
  const scheduledRuns = scheduledExportRes.data ?? [];
  const weeklyJobs: LabeledValue[] = [];
  for (let w = 11; w >= 0; w -= 1) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);
    const count = scheduledRuns.filter((row) => {
      const runAt = new Date(row.last_run_at as string);
      return runAt >= weekStart && runAt < weekEnd;
    }).length;
    weeklyJobs.push({ label: `Sem ${12 - w}`, value: count });
  }

  const exportActivity = {
    byFormat: [...formatCounts.entries()].map(([label, value]) => ({ label, value })),
    timeline: weeklyJobs.map((row) => ({ label: row.label, jobs: row.value })),
  };

  const corrCounts = new Map<string, number>();
  for (const c of correctionsRes.data ?? []) {
    const st = String(c.status ?? 'pending');
    corrCounts.set(st, (corrCounts.get(st) ?? 0) + 1);
  }
  const correctionsByStatus: LabeledValue[] = [...corrCounts.entries()].map(([k, value]) => ({
    label: CORRECTION_STATUS_LABELS[k] ?? k,
    value,
  }));

  const widgetCounts = new Map<string, number>();
  for (const d of dashboardsRes.data ?? []) {
    const cfg = d.config as { widgets?: { type?: string }[] } | null;
    const widgets = cfg?.widgets ?? [];
    if (widgets.length === 0) widgetCounts.set('Sem widgets', (widgetCounts.get('Sem widgets') ?? 0) + 1);
    for (const w of widgets) {
      const t = w.type ?? 'outro';
      widgetCounts.set(t, (widgetCounts.get(t) ?? 0) + 1);
    }
  }
  const widgetUsage: LabeledValue[] = [...widgetCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const monthCounts = new Map<string, number>();
  for (const d of dashboardsRes.data ?? []) {
    if (!d.created_at) continue;
    const dt = new Date(d.created_at as string);
    const key = dt.toLocaleDateString('pt-BR', { month: 'short' });
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const savedPanelsTrend: LabeledValue[] = [...monthCounts.entries()].map(([label, value]) => ({
    label,
    value,
  }));

  const panelBuilderFunnel: LabeledValue[] = [
    { label: 'Painéis criados', value: dashboardsRes.data?.length ?? 0 },
    {
      label: 'Com widgets',
      value: (dashboardsRes.data ?? []).filter((d) => {
        const cfg = d.config as { widgets?: unknown[] } | null;
        return (cfg?.widgets?.length ?? 0) > 0;
      }).length,
    },
    {
      label: 'Aprovados',
      value: (dashboardsRes.data ?? []).filter((d) => (d as { is_approved?: boolean }).is_approved).length,
    },
  ];

  let fontLarge = 0;
  let reading = 0;
  let spacing = 0;
  let dark = 0;
  for (const p of prefsRes.data ?? []) {
    if (p.font_size && p.font_size !== 'normal') fontLarge += 1;
    if (p.reading_mode) reading += 1;
    if (p.text_spacing) spacing += 1;
    if (p.theme === 'dark') dark += 1;
  }
  const accessibilityAdoption: LabeledValue[] = [
    { label: 'Fonte ampliada', value: fontLarge },
    { label: 'Modo leitura', value: reading },
    { label: 'Espaçamento', value: spacing },
    { label: 'Tema escuro', value: dark },
  ];

  const entityCounts = new Map<string, number>();
  for (const a of auditRes.data ?? []) {
    const t = String(a.entity_type ?? 'outro');
    entityCounts.set(t, (entityCounts.get(t) ?? 0) + 1);
  }
  const moduleAccess: LabeledValue[] = [...entityCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const auditDay = new Map<string, number>();
  for (const a of auditRes.data ?? []) {
    const day = (a.created_at as string).slice(0, 10);
    auditDay.set(day, (auditDay.get(day) ?? 0) + 1);
  }
  const auditByDay: LabeledValue[] = [...auditDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([label, value]) => ({
      label: new Date(label).toLocaleDateString('pt-BR', { weekday: 'short' }),
      value,
    }));

  const roleCounts = new Map<string, number>();
  for (const r of rolesRes.data ?? []) {
    const role = String(r.role ?? 'cidadao');
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  const usersByRole: LabeledValue[] = [...roleCounts.entries()].map(([k, value]) => ({
    label: ROLE_LABELS[k] ?? k,
    value,
  }));

  const zoneDemand = new Map<string, number>();
  const zoneRatings = new Map<string, number>();
  const zoneWait = new Map<string, { sum: number; n: number }>();
  for (const r of ratingsRes.data ?? []) {
    const district = (r.public_services as { district?: string } | null)?.district;
    const zone = district ? bairroParaZona(district) : 'Desconhecida';
    if (region !== 'all' && zone !== region) continue;
    zoneRatings.set(zone, (zoneRatings.get(zone) ?? 0) + 1);
    zoneDemand.set(zone, (zoneDemand.get(zone) ?? 0) + 1);
    if (r.wait_time_score != null) {
      const w = zoneWait.get(zone) ?? { sum: 0, n: 0 };
      w.sum += Number(r.wait_time_score);
      w.n += 1;
      zoneWait.set(zone, w);
    }
  }

  const heatmapByTerritory = (metric: string): LabeledValue[] => {
    const zones = ['Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste', 'Desconhecida'];
    return zones
      .filter((z) => region === 'all' || z.toLowerCase().includes(region) || region === z)
      .map((label) => {
        if (metric === 'avaliacoes') {
          return { label, value: zoneRatings.get(label) ?? 0 };
        }
        if (metric === 'espera') {
          const w = zoneWait.get(label);
          const avg = w && w.n > 0 ? Math.round((w.sum / w.n) * 10) : 0;
          return { label, value: avg };
        }
        return { label, value: zoneDemand.get(label) ?? 0 };
      });
  };

  const metricTrends: SeriesPoint[] = [];

  return {
    classificationByCategory,
    classificationTrend,
    referralFunnel,
    referralTimeline,
    commissionByTheme,
    councilMemberQueue,
    notificationStats,
    exportActivity,
    correctionsByStatus,
    widgetUsage,
    savedPanelsTrend,
    panelBuilderFunnel,
    accessibilityAdoption,
    moduleAccess,
    auditByDay,
    usersByRole,
    heatmapByTerritory,
    metricTrends,
  };
}
