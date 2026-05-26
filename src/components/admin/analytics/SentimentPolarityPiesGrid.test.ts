import { describe, expect, it } from 'vitest';
import {
  sentimentPolarityHasData,
  sentimentPolarityTotal,
} from '@/components/admin/analytics/SentimentPolarityPiesGrid';

describe('SentimentPolarityPiesGrid helpers', () => {
  it('detecta card sem dados quando todas as fatias são zero', () => {
    const item = {
      id: 'north',
      label: 'Zona Norte',
      slices: [
        { id: 'positive', label: 'Positivo', value: 0 },
        { id: 'neutral', label: 'Neutro', value: 0 },
        { id: 'negative', label: 'Negativo', value: 0 },
      ],
    };
    expect(sentimentPolarityTotal(item)).toBe(0);
    expect(sentimentPolarityHasData(item)).toBe(false);
  });

  it('detecta card com dados quando há volume nas fatias', () => {
    const item = {
      id: 'north',
      label: 'Zona Norte',
      slices: [
        { id: 'positive', label: 'Positivo', value: 40 },
        { id: 'neutral', label: 'Neutro', value: 35 },
        { id: 'negative', label: 'Negativo', value: 25 },
      ],
    };
    expect(sentimentPolarityHasData(item)).toBe(true);
  });
});
