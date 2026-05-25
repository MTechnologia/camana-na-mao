import { describe, expect, it } from 'vitest';
import {
  formatUrbanReportRegionLabel,
  urbanReportMatchesGlobalRegion,
} from '@/lib/urbanReportRegion';

describe('urbanReportRegion', () => {
  it('formata endereço, bairro e zona', () => {
    const label = formatUrbanReportRegionLabel({
      locationAddress: 'Avenida Lineu de Paula Machado 1477',
      neighborhood: 'Jardim Everest',
      latitude: -23.57,
      longitude: -46.72,
    });
    expect(label).toContain('Avenida Lineu');
    expect(label).toContain('Jardim Everest');
    expect(label).toMatch(/Zona Oeste/i);
  });

  it('filtra pela chave global west (Zona Oeste)', () => {
    const match = urbanReportMatchesGlobalRegion(
      {
        locationAddress: 'Rua X',
        neighborhood: 'Pinheiros',
        latitude: -23.56,
        longitude: -46.69,
      },
      'west',
    );
    expect(match).toBe(true);
  });
});
