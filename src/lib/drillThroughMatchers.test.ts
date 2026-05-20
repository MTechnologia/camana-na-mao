import { describe, expect, it } from 'vitest';
import type { ChartBarPoint } from '@/types/analyticsDrill';
import {
  drillThroughResultLimit,
  matchesDistrictBar,
  matchesTerritoryBar,
  shouldFetchTransportForCategory,
} from '@/lib/drillThroughMatchers';

describe('drillThroughMatchers', () => {
  it('limite de listagem acompanha o volume da barra', () => {
    expect(drillThroughResultLimit(8)).toBe(8);
    expect(drillThroughResultLimit(1)).toBe(3);
    expect(drillThroughResultLimit(100)).toBe(12);
  });

  it('reconhece categoria de transporte', () => {
    expect(shouldFetchTransportForCategory('atraso')).toBe(true);
    expect(shouldFetchTransportForCategory('iluminacao')).toBe(false);
  });

  it('bairro com hífen no fim casa com o rótulo do gráfico', () => {
    const bar: ChartBarPoint = {
      id: 'jd',
      label: 'Jardim Esmeralda -',
      value: 1,
      filterKey: 'district',
      filterValue: 'Jardim Esmeralda -',
    };
    expect(matchesDistrictBar(bar, 'Jardim Esmeralda', null)).toBe(true);
    expect(matchesDistrictBar(bar, null, 'Jardim Esmeralda, São Paulo')).toBe(true);
  });

  it('filtro de região usa zona derivada do texto', () => {
    const bar: ChartBarPoint = {
      id: 'west',
      label: 'Zona Oeste',
      value: 5,
      filterKey: 'region',
      filterValue: 'west',
    };
    expect(
      matchesTerritoryBar(bar, 'west', 'Pinheiros', null, -23.56, -46.69),
    ).toBe(true);
  });
});
