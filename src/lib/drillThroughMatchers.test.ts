import { describe, expect, it } from 'vitest';
import type { ChartBarPoint } from '@/types/analyticsDrill';
import {
  DISTRICT_FALLBACK_ID,
  DISTRICT_LABEL_FALLBACK,
  STREET_FALLBACK_ID,
  STREET_LABEL_FALLBACK,
} from '@/lib/reportsAnalyticsAggregates';
import {
  drillThroughResultLimit,
  matchesDistrictBar,
  matchesStreetBar,
  matchesTerritoryBar,
  matchesTerritoryBarWithStreet,
  parseStreetBarLabel,
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

  it('logradouro casa com rótulo do gráfico mesmo sem coluna street', () => {
    const bar: ChartBarPoint = {
      id: 'av-lineu',
      label: 'Avenida Lineu de Paula Machado, 1477',
      value: 2,
      filterKey: 'street',
      filterValue: 'Avenida Lineu de Paula Machado, 1477',
    };
    expect(
      matchesStreetBar(
        bar,
        'Butantã',
        'Avenida Lineu de Paula Machado, 1477, São Paulo',
        null,
        null,
        'Butantã',
      ),
    ).toBe(true);
    expect(
      matchesStreetBar(
        bar,
        'Butantã',
        'Outra Rua, 10, São Paulo',
        null,
        null,
        'Butantã',
      ),
    ).toBe(false);
  });

  it('parseStreetBarLabel separa logradouro e número', () => {
    expect(parseStreetBarLabel('Avenida Lineu de Paula Machado, 1477')).toEqual({
      street: 'Avenida Lineu de Paula Machado',
      number: '1477',
    });
  });

  it('barra Sem logradouro só casa quando o rótulo territorial é fallback', () => {
    const bar: ChartBarPoint = {
      id: STREET_FALLBACK_ID,
      label: STREET_LABEL_FALLBACK,
      value: 3,
      filterKey: 'street',
      filterValue: STREET_FALLBACK_ID,
    };
    expect(
      matchesStreetBar(bar, null, null, null, null, DISTRICT_FALLBACK_ID),
    ).toBe(true);
    expect(
      matchesStreetBar(
        bar,
        null,
        'Avenida Paulista, 1000, São Paulo',
        null,
        null,
        DISTRICT_FALLBACK_ID,
      ),
    ).toBe(false);
    expect(
      matchesStreetBar(
        bar,
        null,
        'Avenida Paulista, 1000, São Paulo',
        'Avenida Paulista',
        '1000',
        DISTRICT_FALLBACK_ID,
      ),
    ).toBe(false);
  });

  it('barra Sem bairro usa o mesmo rótulo que a agregação territorial', () => {
    const bar: ChartBarPoint = {
      id: DISTRICT_FALLBACK_ID,
      label: DISTRICT_LABEL_FALLBACK,
      value: 2,
      filterKey: 'district',
      filterValue: DISTRICT_FALLBACK_ID,
    };
    expect(matchesDistrictBar(bar, null, null)).toBe(true);
    expect(matchesDistrictBar(bar, null, 'Pinheiros, São Paulo')).toBe(false);
    expect(matchesDistrictBar(bar, 'Pinheiros', null)).toBe(false);
  });

  it('drill em rua respeita activeRegion quando o filtro global é todas', () => {
    const bar: ChartBarPoint = {
      id: STREET_FALLBACK_ID,
      label: STREET_LABEL_FALLBACK,
      value: 1,
      filterKey: 'street',
      filterValue: STREET_FALLBACK_ID,
    };
    expect(
      matchesTerritoryBarWithStreet(
        bar,
        'all',
        'Pinheiros',
        'Rua dos Pinheiros, São Paulo',
        -23.56,
        -46.69,
        null,
        null,
        'Pinheiros',
        'west',
      ),
    ).toBe(false);
    expect(
      matchesTerritoryBarWithStreet(
        bar,
        'all',
        null,
        null,
        null,
        null,
        null,
        null,
        DISTRICT_FALLBACK_ID,
        'unknown',
      ),
    ).toBe(true);
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
