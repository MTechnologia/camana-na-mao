import { describe, expect, it } from 'vitest';
import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import { buildMetricTrendsFromStats } from '@/lib/reportsAnalyticsAggregates';

function mockStats(overrides: Partial<ReportsAnalyticsStats> = {}): ReportsAnalyticsStats {
  return {
    total: 10,
    urban: 8,
    transport: 2,
    evaluation: 0,
    pending: 3,
    resolved: 5,
    critical: 1,
    trend: 0,
    resolvedTrend: 0,
    criticalTrend: 0,
    pendingTrend: 0,
    timeline: [
      { date: '2026-05-01', urban: 2, transport: 0, evaluation: 0, total: 2, resolved: 1 },
      { date: '2026-05-02', urban: 3, transport: 1, evaluation: 0, total: 4, resolved: 2 },
    ],
    byStatus: [{ status: 'Pendente', count: 3, color: '' }],
    categories: [],
    volumeByZone: [],
    demographics: {
      byGender: [],
      byRace: [],
      bySocialClass: [],
      byAgeGroup: [],
      byRegion: [{ region: 'Sé', count: 5, sentiment: 60 }],
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
      patterns: [{ id: 'p1', type: 'frequency', severity: 'info', title: 'A', description: 'd' }],
      criticalPendingReports: [],
    },
    ...overrides,
  };
}

describe('buildMetricTrendsFromStats', () => {
  it('gera um ponto por dia na timeline com os quatro indicadores', () => {
    const series = buildMetricTrendsFromStats(mockStats());
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      volume: 2,
      sentiment: 60,
      patterns: 1,
    });
    expect(series[0].response).toBeTypeOf('number');
  });

  it('fallback com um ponto quando não há timeline mas há total', () => {
    const series = buildMetricTrendsFromStats(
      mockStats({ timeline: [], total: 7, urban: 7, transport: 0 }),
    );
    expect(series).toHaveLength(1);
    expect(series[0].volume).toBe(7);
  });
});
