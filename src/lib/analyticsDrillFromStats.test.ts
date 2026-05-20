import { describe, expect, it } from 'vitest';
import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import {
  buildChartSeriesFromStats,
  buildDrillKpisFromStats,
  sumChartBarValues,
  unallocatedVolumeFromStats,
} from '@/lib/analyticsDrillFromStats';

function mockStats(overrides: Partial<ReportsAnalyticsStats> = {}): ReportsAnalyticsStats {
  return {
    total: 36,
    urban: 30,
    transport: 4,
    evaluation: 2,
    pending: 10,
    resolved: 20,
    critical: 2,
    trend: 0,
    resolvedTrend: 0,
    criticalTrend: 0,
    pendingTrend: 0,
    timeline: [],
    byStatus: [
      { status: 'Pendente', count: 10, color: '' },
      { status: 'Resolvido', count: 20, color: '' },
    ],
    categories: [{ category: 'Mobilidade', count: 20 }],
    demographics: {
      byGender: [],
      byRace: [],
      bySocialClass: [],
      byAgeGroup: [],
      byRegion: [
        { region: 'Sé', count: 15, sentiment: 60 },
        { region: 'Tatuapé', count: 5, sentiment: 40 },
        { region: 'Pinheiros', count: 5, sentiment: 55 },
      ],
    },
    engagement: {
      totalLikes: 0,
      totalComments: 0,
      avgLikesPerReport: 0,
      avgCommentsPerReport: 0,
      likesTrend: 0,
      commentsTrend: 0,
      topReports: [],
      conversionFunnel: [],
    },
    criticality: {
      criticalScore: 0,
      bySeverity: [],
      patterns: [{ id: '1', title: 'Padrão A', count: 3 } as never],
      criticalPendingReports: [],
    },
    ...overrides,
  };
}

describe('analyticsDrillFromStats volume parity', () => {
  it('detecta relatos fora da distribuição por bairro', () => {
    const stats = mockStats();
    expect(unallocatedVolumeFromStats(stats)).toBe(11);
  });

  it('KPI de volume no overview iguala o total de relatos', () => {
    const stats = mockStats();
    const kpis = buildDrillKpisFromStats(stats, 'overview');
    expect(kpis.volume).toBe(36);
  });

  it('soma das barras de volume no overview iguala o KPI', () => {
    const stats = mockStats();
    const kpis = buildDrillKpisFromStats(stats, 'overview');
    const chart = buildChartSeriesFromStats(stats, 'overview', 'volume');
    expect(sumChartBarValues(chart)).toBe(kpis.volume);
  });
});
