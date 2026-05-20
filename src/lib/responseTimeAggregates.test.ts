import { describe, expect, it } from 'vitest';
import {
  buildResponseTimeDrillStats,
  EMPTY_RESPONSE_TIME_DRILL,
  enrichZonesFromNeighborhoodBreakdown,
  filterResponseTimeRecords,
  recordsFromUrbanRows,
  type ResponseTimeRecord,
} from '@/lib/responseTimeAggregates';
import type { UrbanReportRow } from '@/lib/reportsAnalyticsAggregates';

function rec(overrides: Partial<ResponseTimeRecord> = {}): ResponseTimeRecord {
  return {
    source: 'urbano',
    category: 'Mobilidade',
    neighborhood: 'Tatuapé',
    zone: 'Zona Leste',
    hours: 12,
    createdAt: '2026-04-01T10:00:00Z',
    closedAt: '2026-04-01T22:00:00Z',
    ...overrides,
  };
}

describe('buildResponseTimeDrillStats', () => {
  it('retorna estrutura vazia quando não há registros', () => {
    expect(buildResponseTimeDrillStats([])).toEqual(EMPTY_RESPONSE_TIME_DRILL);
  });

  it('calcula média global e por zona', () => {
    const stats = buildResponseTimeDrillStats([
      rec({ zone: 'Zona Leste', hours: 10 }),
      rec({ zone: 'Zona Leste', hours: 20 }),
      rec({ zone: 'Centro', hours: 6, neighborhood: 'Sé' }),
    ]);
    expect(stats.resolvedCount).toBe(3);
    expect(stats.avgHours).toBe(12);
    expect(stats.byZone.find((z) => z.zone === 'Zona Leste')?.avgHours).toBe(15);
    expect(stats.byZone.find((z) => z.zone === 'Centro')?.avgHours).toBe(6);
  });

  it('agrega bairros e categorias', () => {
    const stats = buildResponseTimeDrillStats([
      rec({ neighborhood: 'Tatuapé', category: 'Mobilidade', hours: 8 }),
      rec({ neighborhood: 'Tatuapé', category: 'Mobilidade', hours: 16 }),
      rec({
        source: 'transporte',
        reportType: 'atraso',
        category: 'Linha 1',
        neighborhood: 'Santana',
        zone: 'Zona Norte',
        hours: 4,
      }),
    ]);
    const tatuape = stats.byNeighborhood.find((n) => n.neighborhood === 'Tatuapé');
    expect(tatuape?.avgHours).toBe(12);
    expect(tatuape?.count).toBe(2);
    expect(stats.byCategory.some((c) => c.category === 'Mobilidade')).toBe(true);
    expect(stats.byCategory.some((c) => c.category === 'atraso')).toBe(true);
  });
});

describe('recordsFromUrbanRows', () => {
  it('usa coords e bairro como o volume territorial', () => {
    const rows: UrbanReportRow[] = [
      {
        id: '1',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-02T10:00:00Z',
        status: 'resolved',
        category: 'Mobilidade',
        neighborhood: 'Jardim Everest',
        location_address: null,
        latitude: -23.61,
        longitude: -46.72,
      },
      {
        id: '2',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T14:00:00Z',
        status: 'pending',
        category: 'Mobilidade',
        neighborhood: 'Centro',
      },
    ];
    const records = recordsFromUrbanRows(rows);
    expect(records).toHaveLength(1);
    expect(records[0].hours).toBe(24);
    expect(records[0].neighborhood).toBe('Jardim Everest');
  });
});

describe('enrichZonesFromNeighborhoodBreakdown', () => {
  it('reclassifica Não informada quando o bairro existe no breakdown de volume', () => {
    const records: ResponseTimeRecord[] = [
      {
        source: 'urbano',
        category: 'X',
        neighborhood: 'Jardim Everest',
        zone: 'Não informada',
        hours: 10,
        createdAt: '2026-04-01T10:00:00Z',
        closedAt: '2026-04-01T20:00:00Z',
      },
    ];
    const enriched = enrichZonesFromNeighborhoodBreakdown(records, [
      { neighborhood: 'Jardim Everest', zone: 'Zona Oeste' },
    ]);
    expect(enriched[0].zone).toBe('Zona Oeste');
  });
});

describe('filterResponseTimeRecords', () => {
  it('filtra por zona quando region está definida', () => {
    const rows = [
      rec({ zone: 'Zona Leste' }),
      rec({ zone: 'Zona Norte', neighborhood: 'Santana' }),
    ];
    const filtered = filterResponseTimeRecords(rows, { region: 'east' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].zone).toBe('Zona Leste');
  });

  it('mantém todos quando categoria é all', () => {
    const rows = [rec(), rec({ category: 'Iluminação' })];
    expect(filterResponseTimeRecords(rows, { category: 'all' })).toHaveLength(2);
  });
});
