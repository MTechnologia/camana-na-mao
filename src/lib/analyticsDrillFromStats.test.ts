import { describe, expect, it } from 'vitest';
import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import {
  buildChartSeriesFromStats,
  buildDrillKpisForRegionFilter,
  buildDrillKpisFromStats,
  buildSentimentPolarityFromStats,
  sumChartBarValues,
  unallocatedVolumeFromStats,
} from '@/lib/analyticsDrillFromStats';
import { countRecurringThemesFromCategories } from '@/lib/reportsAnalyticsAggregates';
import { EMPTY_RESPONSE_TIME_DRILL } from '@/lib/responseTimeAggregates';

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
    streetBreakdown: [],
    criticality: {
      criticalScore: 0,
      bySeverity: [],
      patterns: [{ id: '1', title: 'Padrão A', count: 3 } as never],
      criticalPendingReports: [],
    },
    territoryPatterns: [],
    neighborhoodBreakdown: [],
    streetBreakdown: [],
    responseTime: EMPTY_RESPONSE_TIME_DRILL,
    ...overrides,
  };
}

const mockResponseTime = {
  avgHours: 18.5,
  resolvedCount: 4,
  byZone: [
    { zone: 'Centro', avgHours: 10, count: 1 },
    { zone: 'Zona Norte', avgHours: 0, count: 0 },
    { zone: 'Zona Sul', avgHours: 0, count: 0 },
    { zone: 'Zona Leste', avgHours: 24, count: 2 },
    { zone: 'Zona Oeste', avgHours: 30, count: 1 },
    { zone: 'Não informada', avgHours: 0, count: 0 },
  ],
  byNeighborhood: [
    { neighborhood: 'Tatuapé', zone: 'Zona Leste', avgHours: 20, count: 1 },
    { neighborhood: 'Mooca', zone: 'Zona Leste', avgHours: 28, count: 1 },
    { neighborhood: 'Pinheiros', zone: 'Zona Oeste', avgHours: 30, count: 1 },
  ],
  byCategory: [
    { category: 'Mobilidade', avgHours: 18.5, count: 4 },
    { category: 'Iluminação', avgHours: 10, count: 1 },
  ],
} as const;

describe('analyticsDrillFromStats volume parity', () => {
  it('detecta relatos fora da distribuição por bairro (universo urbano)', () => {
    const stats = mockStats();
    expect(unallocatedVolumeFromStats(stats)).toBe(5);
  });

  it('KPI de volume no overview usa o universo territorial urbano', () => {
    const stats = mockStats();
    const kpis = buildDrillKpisFromStats(stats, 'overview');
    expect(kpis.volume).toBe(30);
  });

  it('KPI de padrões conta temas recorrentes nas categorias do recorte', () => {
    const stats = mockStats({
      categories: [
        { category: 'lixo', count: 4 },
        { category: 'via_publica', count: 1 },
        { category: 'iluminacao', count: 3 },
      ],
      criticality: {
        criticalScore: 0,
        bySeverity: [],
        patterns: Array.from({ length: 10 }, (_, i) => ({
          id: `p${i}`,
          type: 'frequency' as const,
          severity: 'info' as const,
          title: `Tema ${i}`,
          description: '',
          suggestedAction: '',
        })),
        criticalPendingReports: [],
      },
    });
    expect(countRecurringThemesFromCategories(stats.categories)).toBe(2);
    expect(buildDrillKpisFromStats(stats, 'overview').patterns).toBe(2);
  });

  it('buildDrillKpisForRegionFilter usa volume da zona, não o total do RPC', () => {
    const stats = mockStats({
      total: 330,
      volumeByZone: [
        { zone: 'Zona Norte', count: 4 },
        { zone: 'Zona Leste', count: 2 },
        { zone: 'Centro', count: 0 },
        { zone: 'Zona Sul', count: 0 },
        { zone: 'Zona Oeste', count: 0 },
        { zone: 'Não informada', count: 0 },
      ],
    });
    expect(buildDrillKpisForRegionFilter(stats, 'all').volume).toBe(6);
    expect(buildDrillKpisForRegionFilter(stats, 'north').volume).toBe(4);
  });

  it('KPI de sentimento fica indisponível quando só há placeholder 50%', () => {
    const stats = mockStats({
      demographics: {
        byGender: [],
        byRace: [],
        bySocialClass: [],
        byAgeGroup: [],
        byRegion: [
          { region: 'Sé', count: 15, sentiment: 50 },
          { region: 'Tatuapé', count: 5, sentiment: 50 },
        ],
      },
    });
    expect(buildDrillKpisFromStats(stats, 'overview').sentimentPct).toBeNull();
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

  it('KPI de volume com volumeByZone iguala a soma das barras (sem inflar com RPC total)', () => {
    const stats = mockStats({
      total: 36,
      urban: 30,
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
    expect(kpis.volume).toBe(28);
    expect(chart.find((b) => b.label === 'Não informada')?.value).toBe(13);
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

  it('drill por bairro lista logradouros, não categorias (HU-3.1)', () => {
    const stats = mockStats({
      neighborhoodBreakdown: [{ neighborhood: 'Santana', zone: 'Zona Norte', count: 4 }],
      streetBreakdown: [
        { street: 'Rua Voluntários', neighborhood: 'Santana', zone: 'Zona Norte', count: 2 },
        { street: 'Av. Cruzeiro do Sul', neighborhood: 'Santana', zone: 'Zona Norte', count: 2 },
      ],
      categories: [{ category: 'Mobilidade', count: 99 }],
    });
    const chart = buildChartSeriesFromStats(stats, 'street', 'volume', 'north', 'Santana');
    expect(chart).toHaveLength(2);
    expect(chart.every((b) => b.filterKey === 'street')).toBe(true);
    expect(chart.map((b) => b.label)).toEqual(
      expect.arrayContaining(['Rua Voluntários', 'Av. Cruzeiro do Sul']),
    );
    expect(chart.some((b) => b.label === 'Mobilidade')).toBe(false);
    const kpis = buildDrillKpisFromStats(stats, 'street', 'north', 'Santana');
    expect(kpis.volume).toBe(4);
  });

  it('drill de distrito usa a mesma base urbana do nível de logradouro', () => {
    const stats = mockStats({
      neighborhoodBreakdown: [{ neighborhood: 'Sem bairro definido', zone: 'Não informada', count: 83 }],
      streetBreakdown: [
        {
          street: 'Sem logradouro definido',
          neighborhood: 'Sem bairro definido',
          zone: 'Não informada',
          count: 3,
        },
      ],
    });
    const chart = buildChartSeriesFromStats(
      stats,
      'street',
      'volume',
      'unknown',
      'Sem bairro definido',
    );
    expect(chart.find((b) => b.label === 'Sem logradouro definido')?.value).toBe(3);
    const kpis = buildDrillKpisFromStats(stats, 'street', 'unknown', 'Sem bairro definido');
    expect(kpis.volume).toBe(3);
    expect(sumChartBarValues(chart)).toBe(3);

    const districtChart = buildChartSeriesFromStats(stats, 'region', 'volume', 'unknown');
    expect(districtChart.find((b) => b.label === 'Sem bairro definido')?.value).toBe(3);
  });
});

describe('analyticsDrillFromStats response time (HU-2.2)', () => {
  it('KPI de tempo no overview usa média real, não proxy pendente/resolvido', () => {
    const stats = mockStats({
      pending: 10,
      resolved: 20,
      responseTime: mockResponseTime,
    });
    const kpis = buildDrillKpisFromStats(stats, 'overview');
    expect(kpis.responseHours).toBe(18.5);
    expect(kpis.responseHours).not.toBe(99);
  });

  it('barras de tempo no overview variam por zona', () => {
    const stats = mockStats({ responseTime: mockResponseTime });
    const chart = buildChartSeriesFromStats(stats, 'overview', 'response_time');
    expect(chart.find((b) => b.label === 'Centro')?.value).toBe(10);
    expect(chart.find((b) => b.label === 'Zona Leste')?.value).toBe(24);
    expect(chart.find((b) => b.label === 'Zona Norte')?.value).toBe(0);
    const values = chart.map((b) => b.value);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('KPI de tempo no drill de região usa média da zona ativa', () => {
    const stats = mockStats({ responseTime: mockResponseTime });
    const kpis = buildDrillKpisFromStats(stats, 'region', 'east');
    expect(kpis.responseHours).toBe(24);
  });

  it('gráfico de tempo no drill de região lista bairros com avgHours', () => {
    const stats = mockStats({ responseTime: mockResponseTime });
    const chart = buildChartSeriesFromStats(stats, 'region', 'response_time', 'east');
    expect(chart.map((b) => b.label)).toEqual(expect.arrayContaining(['Tatuapé', 'Mooca']));
    expect(chart.find((b) => b.label === 'Tatuapé')?.value).toBe(20);
  });
});

describe('analyticsDrillFromStats sentiment rounding', () => {
  it('fatias de polaridade somam 100%', () => {
    const stats = mockStats({
      demographics: {
        byGender: [],
        byRace: [],
        bySocialClass: [],
        byAgeGroup: [],
        byRegion: [{ region: 'Sé', count: 3, sentiment: 67 }],
      },
      volumeByZone: [],
    });
    const rows = buildSentimentPolarityFromStats(stats, 'overview');
    const centro = rows.find((r) => r.label === 'Centro');
    const total = (centro?.slices ?? []).reduce((acc, s) => acc + s.value, 0);
    expect(total).toBe(100);
  });
});
