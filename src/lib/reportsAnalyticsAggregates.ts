import type { PatternAlert } from '@/components/analytics/PatternAlerts';
import type { ReportsAnalyticsStats, TimelineDataPoint } from '@/hooks/useReportsAnalytics';
import type { PatternRankRow } from '@/types/analyticsDrill';
import type { SeriesPoint } from '@/lib/chartTypes';
import { regionLabel } from '@/lib/analyticsLabels';
import {
  bairroParaZona,
  ZONA_DESCONHECIDA,
  ZONAS_FILTRO,
  type ZonaVolumeOuDesconhecida,
} from '@/lib/regionMapping';

export function filterGeoRowsByRegion(
  rows: GeoReportRow[],
  region?: string,
): GeoReportRow[] {
  if (!region || region === 'all') return rows;
  const zoneLabel = regionLabel(region);
  return rows.filter((row) => {
    const text = [row.neighborhood, row.location].filter(Boolean).join(' ');
    return bairroParaZona(text, row.latitude, row.longitude) === zoneLabel;
  });
}

export type UrbanReportRow = {
  id: string;
  created_at: string | null;
  updated_at?: string | null;
  status: string | null;
  category: string | null;
  neighborhood: string | null;
  location_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type GeoReportRow = {
  neighborhood?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** Contagem por zona canônica usando coords (prioridade) + texto de localização. */
export function buildVolumeByZoneFromGeoRows(
  rows: GeoReportRow[],
): { zone: ZonaVolumeOuDesconhecida; count: number }[] {
  const counts = new Map<ZonaVolumeOuDesconhecida, number>();
  for (const zona of ZONAS_FILTRO) counts.set(zona, 0);

  for (const row of rows) {
    const text = [row.neighborhood, row.location].filter(Boolean).join(' ');
    const zone = bairroParaZona(text, row.latitude, row.longitude);
    const key = counts.has(zone) ? zone : ZONA_DESCONHECIDA;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return ZONAS_FILTRO.map((zone) => ({ zone, count: counts.get(zone) ?? 0 }));
}

export const DISTRICT_LABEL_FALLBACK = 'Sem bairro definido';

/** Rótulo de bairro/local para drill-down territorial. */
export function districtLabelFromGeoRow(row: GeoReportRow): string {
  const nb = row.neighborhood?.trim();
  if (nb) return nb;
  const loc = row.location?.trim();
  if (loc) {
    const part = loc.split(',')[0]?.trim();
    if (part && part.length <= 80) return part;
    return loc.slice(0, 80);
  }
  return DISTRICT_LABEL_FALLBACK;
}

/** Contagem por bairro dentro de cada zona (mesma base do gráfico por região). */
export function buildNeighborhoodBreakdownFromGeoRows(
  rows: GeoReportRow[],
): { neighborhood: string; zone: ZonaVolumeOuDesconhecida; count: number }[] {
  const map = new Map<string, { zone: ZonaVolumeOuDesconhecida; count: number }>();

  for (const row of rows) {
    const text = [row.neighborhood, row.location].filter(Boolean).join(' ');
    const zone = bairroParaZona(text, row.latitude, row.longitude);
    const label = districtLabelFromGeoRow(row);
    const key = `${zone}\u0000${label}`;
    const cur = map.get(key) ?? { zone, count: 0 };
    cur.count += 1;
    map.set(key, cur);
  }

  return [...map.entries()]
    .map(([key, v]) => ({
      neighborhood: key.split('\u0000')[1] ?? DISTRICT_LABEL_FALLBACK,
      zone: v.zone,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Série para o gráfico "Quatro indicadores no tempo" a partir da timeline real. */
export function buildMetricTrendsFromStats(stats: ReportsAnalyticsStats | null): SeriesPoint[] {
  if (!stats) return [];

  const patterns = stats.criticality.patterns.length || 0;
  const regionRows = stats.demographics.byRegion;
  const regionTotal = regionRows.reduce((s, r) => s + r.count, 0);
  const sentiment =
    regionTotal > 0
      ? Math.round(
          regionRows.reduce((s, r) => s + (r.sentiment ?? 50) * r.count, 0) / regionTotal,
        )
      : 50;
  const pending = stats.byStatus.find((s) => s.status === 'Pendente')?.count ?? stats.pending;
  const resolved = stats.resolved || 0;
  const response =
    stats.total > 0 && resolved > 0
      ? Math.min(99, Math.round((pending / Math.max(resolved, 1)) * 24 * 10) / 10)
      : 0;

  if (stats.timeline.length > 0) {
    return stats.timeline.map((p) => ({
      label: formatTimelineDayLabel(p.date),
      volume: p.total,
      sentiment,
      patterns,
      response,
    }));
  }

  if (stats.total > 0) {
    return [
      {
        label: 'Total no período',
        volume: stats.total,
        sentiment,
        patterns,
        response,
      },
    ];
  }

  return [];
}

export function formatTimelineDayLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Série diária de volume e resolvidos a partir dos relatos urbanos filtrados. */
export function buildTimelineFromUrbanReports(
  reports: UrbanReportRow[],
): TimelineDataPoint[] {
  const buckets = new Map<string, { total: number; resolved: number }>();

  for (const row of reports) {
    const day = row.created_at?.slice(0, 10);
    if (!day) continue;
    const cur = buckets.get(day) ?? { total: 0, resolved: 0 };
    cur.total += 1;
    if (row.status === 'resolved' || row.status === 'closed') {
      cur.resolved += 1;
    }
    buckets.set(day, cur);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      urban: counts.total,
      transport: 0,
      evaluation: 0,
      total: counts.total,
      resolved: counts.resolved,
    }));
}

export function filterUrbanReportsByRegion(
  reports: UrbanReportRow[],
  region?: string,
): UrbanReportRow[] {
  if (!region || region === 'all') return reports;
  const zoneLabel = regionLabel(region);
  return reports.filter((r) => {
    const zone = bairroParaZona(
      [r.neighborhood, r.location_address].filter(Boolean).join(' '),
      r.latitude,
      r.longitude,
    );
    return zone === zoneLabel || r.neighborhood === region || r.neighborhood === zoneLabel;
  });
}

export function patternsFromCategories(
  categories: { category: string; count: number }[],
): PatternAlert[] {
  return [...categories]
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((c) => ({
      id: `cat-${c.category}`,
      type: 'frequency' as const,
      severity: c.count >= 10 ? ('warning' as const) : ('info' as const),
      title: c.category,
      description: `${c.count} relato(s) nesta categoria no recorte selecionado.`,
      suggestedAction: 'Revisar triagem e encaminhamento temático.',
      count: c.count,
    }));
}

export function mapReportPatternsToAlerts(
  rows: {
    id: string;
    pattern_type: string;
    description: string;
    occurrence_count: number | null;
    suggested_action: string | null;
    avg_severity: number | null;
  }[],
): PatternAlert[] {
  return rows.map((p) => ({
    id: p.id,
    type: 'frequency' as const,
    severity:
      (p.avg_severity ?? 0) >= 4 ? ('critical' as const) : ('warning' as const),
    title: p.pattern_type,
    description: p.description,
    suggestedAction: p.suggested_action ?? 'Analisar relatos relacionados no painel.',
    count: p.occurrence_count ?? 0,
    confidence: p.avg_severity != null ? Math.min(1, p.avg_severity / 5) : undefined,
  }));
}

export function patternRankFromAlerts(alerts: PatternAlert[]): PatternRankRow[] {
  return alerts.map((a) => ({
    id: a.id,
    label: a.title,
    count: a.count ?? 0,
    trendPct: 0,
  }));
}

export type AiInsightItem = {
  kind: 'pattern' | 'anomaly' | 'forecast';
  title: string;
  detail: string;
  source: string;
};

/** Insights derivados dos agregados reais (sem texto fixo de protótipo). */
export function buildAiInsightsFromStats(stats: ReportsAnalyticsStats | null): AiInsightItem[] {
  if (!stats || stats.total === 0) return [];

  const insights: AiInsightItem[] = [];

  const topCategory = [...stats.categories].sort((a, b) => b.count - a.count)[0];
  if (topCategory) {
    const pct = Math.round((100 * topCategory.count) / stats.total);
    insights.push({
      kind: 'pattern',
      title: `Maior volume em ${topCategory.category}`,
      detail: `${topCategory.count} relatos (${pct}% do recorte).`,
      source: 'Distribuição por categoria · RPC demografia',
    });
  }

  const topRegion = [...stats.demographics.byRegion].sort((a, b) => b.count - a.count)[0];
  if (topRegion) {
    insights.push({
      kind: 'pattern',
      title: `Concentração em ${topRegion.region}`,
      detail: `${topRegion.count} relato(s) no bairro/região no período.`,
      source: 'Distribuição territorial · urban_reports',
    });
  }

  const activePattern = stats.criticality.patterns[0];
  if (activePattern) {
    insights.push({
      kind: 'pattern',
      title: activePattern.title,
      detail: activePattern.description,
      source: activePattern.count
        ? `Padrão detectado · ${activePattern.count} ocorrências`
        : 'report_patterns',
    });
  }

  if (stats.pending > 0 && stats.resolved > 0) {
    const backlogRatio = Math.round((100 * stats.pending) / stats.total);
    insights.push({
      kind: 'anomaly',
      title: `${stats.pending} relato(s) pendentes`,
      detail: `Backlog de ${backlogRatio}% sobre o volume do período (${stats.resolved} resolvidos).`,
      source: 'Status distribution · RPC demografia',
    });
  }

  const timeline = stats.timeline;
  if (timeline.length >= 7) {
    const recent = timeline.slice(-7);
    const prior = timeline.slice(-14, -7);
    const recentSum = recent.reduce((s, p) => s + p.total, 0);
    const priorSum = prior.reduce((s, p) => s + p.total, 0);
    if (priorSum > 0) {
      const changePct = Math.round(((recentSum - priorSum) / priorSum) * 100);
      insights.push({
        kind: 'forecast',
        title:
          changePct >= 0
            ? `Tendência de alta (${changePct}% vs. semana anterior)`
            : `Tendência de queda (${Math.abs(changePct)}% vs. semana anterior)`,
        detail: `${recentSum} relatos na última semana do gráfico vs. ${priorSum} na semana anterior.`,
        source: 'Série temporal diária · urban_reports',
      });
    }
  }

  return insights.slice(0, 5);
}
