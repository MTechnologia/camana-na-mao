import { describe, it, expect } from 'vitest';
import { globalFiltersToAudiencias } from '@/lib/globalFiltersToAudiencias';

describe('globalFiltersToAudiencias', () => {
  it('não limita data máxima para incluir audiências futuras', () => {
    const filters = globalFiltersToAudiencias('last_30d', 'all');
    expect(filters.endDate).toBeNull();
    expect(filters.startDate).toBeInstanceOf(Date);
  });
});
