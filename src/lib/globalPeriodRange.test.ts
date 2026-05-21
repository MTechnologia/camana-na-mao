import { describe, expect, it } from 'vitest';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';
import { dateRangeToIsoDates, globalPeriodKeyToDateRange } from '@/lib/globalPeriodRange';

const BASE = new Date('2026-05-20T12:00:00');

describe('globalPeriodKeyToDateRange', () => {
  it('last_30d retorna janela de 30 dias', () => {
    const { from, to } = globalPeriodKeyToDateRange('last_30d', BASE);
    const iso = dateRangeToIsoDates({ from, to });
    expect(iso.endDate).toBe('2026-05-20');
    expect(iso.startDate).toBe('2026-04-20');
  });

  it('modo compare usa fallback de 30 dias', () => {
    const { from, to } = globalPeriodKeyToDateRange(PERIOD_COMPARE_VALUE, BASE);
    const iso = dateRangeToIsoDates({ from, to });
    expect(iso.startDate).toBe('2026-04-20');
  });
});
