import { describe, expect, it } from 'vitest';
import { usesUnifiedAnalyticsBar } from '@/lib/adminRouteUtils';

describe('usesUnifiedAnalyticsBar', () => {
  it('exibe barra no dashboard executivo e nas rotas de gestão/encaminhamentos', () => {
    expect(usesUnifiedAnalyticsBar('/admin')).toBe(true);
    expect(usesUnifiedAnalyticsBar('/admin/')).toBe(true);
    expect(usesUnifiedAnalyticsBar('/admin/reports')).toBe(true);
    expect(usesUnifiedAnalyticsBar('/admin/referrals')).toBe(true);
    expect(usesUnifiedAnalyticsBar('/admin/referrals/fluxo')).toBe(true);
    expect(usesUnifiedAnalyticsBar('/admin/commissions')).toBe(true);
  });

  it('não exibe barra em outras rotas admin', () => {
    expect(usesUnifiedAnalyticsBar('/admin/analytics')).toBe(false);
    expect(usesUnifiedAnalyticsBar('/admin/trends')).toBe(false);
    expect(usesUnifiedAnalyticsBar('/admin/reports-heatmap')).toBe(false);
    expect(usesUnifiedAnalyticsBar('/admin/classification-accuracy')).toBe(false);
    expect(usesUnifiedAnalyticsBar('/admin/notifications')).toBe(false);
    expect(usesUnifiedAnalyticsBar('/paineis')).toBe(false);
  });
});
