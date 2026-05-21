import { describe, expect, it } from 'vitest';
import { urbanReportsFiltersToReportsAnalytics } from '@/lib/urbanReportsFiltersToAnalytics';

describe('urbanReportsFiltersToReportsAnalytics', () => {
  it('aplica escopo urbano, período e filtros opcionais', () => {
    const f = urbanReportsFiltersToReportsAnalytics('last_7d', 'mobilidade', 'pending');
    expect(f.scope).toBe('urban_only');
    expect(f.startDate).toBeTruthy();
    expect(f.endDate).toBeTruthy();
    expect(f.category).toBe('mobilidade');
    expect(f.status).toBe('pending');
    expect(f.region).toBeUndefined();
  });

  it('omite categoria e status quando todos', () => {
    const f = urbanReportsFiltersToReportsAnalytics('last_30d', 'all', 'all');
    expect(f.category).toBeUndefined();
    expect(f.status).toBeUndefined();
  });
});
