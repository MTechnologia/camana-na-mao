import { describe, expect, it } from 'vitest';
import {
  dateToInputValue,
  inputValueToDate,
  isCompleteDateRange,
  normalizeDateRange,
} from '@/lib/dateRangeUtils';

describe('dateRangeUtils', () => {
  it('converte ida e volta para input date', () => {
    const d = inputValueToDate('2026-05-17');
    expect(d).toBeDefined();
    expect(dateToInputValue(d)).toBe('2026-05-17');
  });

  it('normaliza intervalo invertido', () => {
    const from = inputValueToDate('2026-05-21')!;
    const to = inputValueToDate('2026-05-17')!;
    const n = normalizeDateRange(from, to)!;
    expect(n.from!.getDate()).toBe(17);
    expect(n.to!.getDate()).toBe(21);
  });

  it('isCompleteDateRange exige ambas as datas', () => {
    expect(isCompleteDateRange({ from: new Date(), to: undefined })).toBe(false);
    expect(
      isCompleteDateRange({
        from: new Date(2026, 4, 17),
        to: new Date(2026, 4, 21),
      }),
    ).toBe(true);
  });
});
