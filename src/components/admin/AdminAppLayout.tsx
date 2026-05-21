import { Outlet } from 'react-router-dom';
import { AnalyticsDrillProvider } from '@/contexts/AnalyticsDrillContext';
import { CustomPanelsProvider } from '@/contexts/CustomPanelsContext';
import { ReferralRoutingRulesProvider } from '@/contexts/ReferralRoutingRulesContext';
import { AdminShell } from '@/components/admin/AdminSidebar';
import { USE_UNIFIED_ANALYTICS_CONTEXT_BAR } from '@/config/analyticsUi';
import { AdminBreadcrumbs } from '@/components/admin/AnalyticsContextBar';
import { UnifiedAnalyticsContextBar } from '@/components/admin/UnifiedAnalyticsContextBar';
import { ReportDrillSheet } from '@/components/admin/analytics/ReportDrillSheet';
import { ReportDetailSheet } from '@/components/admin/ReportDetailSheet';
import { ReportDetailProvider } from '@/contexts/ReportDetailContext';

function AdminMain() {
  return (
    <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
      <AdminBreadcrumbs />
      <Outlet />
    </main>
  );
}

export function AdminAppLayout() {
  return (
    <ReportDetailProvider>
      <AnalyticsDrillProvider>
        <ReferralRoutingRulesProvider>
          <CustomPanelsProvider>
            <AdminShell>
              {USE_UNIFIED_ANALYTICS_CONTEXT_BAR ? <UnifiedAnalyticsContextBar /> : null}
              <AdminMain />
            </AdminShell>
            <ReportDrillSheet />
            <ReportDetailSheet />
          </CustomPanelsProvider>
        </ReferralRoutingRulesProvider>
      </AnalyticsDrillProvider>
    </ReportDetailProvider>
  );
}
