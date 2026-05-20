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
    volumeByZone: [],
    neighborhoodBreakdown: [],
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

  it('overview lista todas as zonas canônicas da capital', () => {
    const stats = mockStats();
    const chart = buildChartSeriesFromStats(stats, 'overview', 'volume');
    expect(chart).toHaveLength(6);
    expect(chart.map((b) => b.label)).toEqual([
      'Centro',
      'Zona Norte',
      'Zona Sul',
      'Zona Leste',
      'Zona Oeste',
      'Não informada',
    ]);
  });

  it('usa volumeByZone geolocalizado quando disponível', () => {
    const stats = mockStats({
      total: 10,
      volumeByZone: [
        { zone: 'Centro', count: 4 },
        { zone: 'Zona Norte', count: 2 },
        { zone: 'Zona Sul', count: 1 },
        { zone: 'Zona Leste', count: 2 },
        { zone: 'Zona Oeste', count: 1 },
        { zone: 'Não informada', count: 0 },
      ],
    });
    const chart = buildChartSeriesFromStats(stats, 'overview', 'volume');
    expect(chart.find((b) => b.label === 'Centro')?.value).toBe(4);
    expect(chart.find((b) => b.label === 'Não informada')?.value).toBe(0);
    expect(sumChartBarValues(chart)).toBe(10);
  });

  it('volumeByZone incompleto aloca gap em Não informada para bater com o KPI', () => {
    const stats = mockStats({
      total: 36,
      volumeByZone: [
        { zone: 'Centro', count: 1 },
        { zone: 'Zona Norte', count: 1 },
        { zone: 'Zona Sul', count: 0 },
        { zone: 'Zona Leste', count: 0 },
        { zone: 'Zona Oeste', count: 13 },
        { zone: 'Não informada', count: 13 },
      ],
    });
    const kpis = buildDrillKpisFromStats(stats, 'overview');
    const chart = buildChartSeriesFromStats(stats, 'overview', 'volume');
    expect(kpis.volume).toBe(36);
    expect(chart.find((b) => b.label === 'Não informada')?.value).toBe(21);
    expect(sumChartBarValues(chart)).toBe(kpis.volume);
  });

  it('drill por zona usa neighborhoodBreakdown e volumeByZone', () => {
    const stats = mockStats({
      total: 5,
      volumeByZone: [
        { zone: 'Zona Norte', count: 3 },
        { zone: 'Zona Leste', count: 2 },
        { zone: 'Centro', count: 0 },
        { zone: 'Zona Sul', count: 0 },
        { zone: 'Zona Oeste', count: 0 },
        { zone: 'Não informada', count: 0 },
      ],
      neighborhoodBreakdown: [
        { neighborhood: 'Santana', zone: 'Zona Norte', count: 2 },
        { neighborhood: 'Casa Verde', zone: 'Zona Norte', count: 1 },
        { neighborhood: 'Tatuapé', zone: 'Zona Leste', count: 2 },
      ],
    });
    const kpis = buildDrillKpisFromStats(stats, 'region', 'north');
    const chart = buildChartSeriesFromStats(stats, 'region', 'volume', 'north');
    expect(kpis.volume).toBe(3);
    expect(chart).toHaveLength(2);
    expect(chart.map((b) => b.label)).toEqual(expect.arrayContaining(['Santana', 'Casa Verde']));
    expect(sumChartBarValues(chart)).toBe(3);
  });
});
