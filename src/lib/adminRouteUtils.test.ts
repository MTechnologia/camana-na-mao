import { describe, expect, it } from 'vitest';
import { usesGlobalReportsAnalytics, usesUnifiedAnalyticsBar } from '@/lib/adminRouteUtils';

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

describe('usesGlobalReportsAnalytics', () => {
  it('ativa provider nas rotas de analytics unificado e nas seções com gráficos', () => {
    expect(usesGlobalReportsAnalytics('/admin')).toBe(true);
    expect(usesGlobalReportsAnalytics('/admin/reports')).toBe(true);
    expect(usesGlobalReportsAnalytics('/admin/exports')).toBe(true);
    expect(usesGlobalReportsAnalytics('/admin/notifications')).toBe(true);
    expect(usesGlobalReportsAnalytics('/admin/docs/overview')).toBe(true);
    expect(usesGlobalReportsAnalytics('/admin/settings/accessibility')).toBe(true);
  });

  it('não ativa provider em rotas admin sem gráficos de seção', () => {
    expect(usesGlobalReportsAnalytics('/admin/analytics')).toBe(false);
    expect(usesGlobalReportsAnalytics('/admin/users')).toBe(false);
  });
});
