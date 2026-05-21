import { Outlet, useLocation } from 'react-router-dom';
import { AnalyticsDrillProvider } from '@/contexts/AnalyticsDrillContext';
import { GlobalReportsAnalyticsProvider } from '@/contexts/GlobalReportsAnalyticsContext';
import { CustomPanelsProvider } from '@/contexts/CustomPanelsContext';
import { ReferralRoutingRulesProvider } from '@/contexts/ReferralRoutingRulesContext';
import { AdminShell } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminBreadcrumbs } from '@/components/admin/AnalyticsContextBar';
import { USE_UNIFIED_ANALYTICS_CONTEXT_BAR } from '@/config/analyticsUi';
import { usesUnifiedAnalyticsBar } from '@/lib/adminRouteUtils';
import { ReportDrillSheet } from '@/components/admin/analytics/ReportDrillSheet';

function AdminMain() {
  const { pathname } = useLocation();
  const pathNorm = pathname.replace(/\/+$/, '') || '/';
  const isExecutiveHome = pathNorm === '/admin';
  const isPaineisSection = pathNorm === '/paineis' || pathNorm.startsWith('/paineis/');
  const isUrbanReportsSection =
    pathNorm === '/admin/reports' || pathNorm.startsWith('/admin/referrals');
  const isEquipmentRatingsSection =
    pathNorm === '/admin/equipment-ratings' ||
    pathNorm.startsWith('/admin/equipment-ratings/');
  const isPublicHearingsSection =
    pathNorm === '/admin/public-hearings' ||
    pathNorm.startsWith('/admin/public-hearings/');
  const isPlatformSection =
    pathNorm === '/admin/notifications' ||
    pathNorm === '/admin/exports' ||
    pathNorm.startsWith('/admin/settings');
  const isGovernanceSection =
    pathNorm.startsWith('/admin/docs') ||
    pathNorm === '/admin/users' ||
    pathNorm === '/admin/audit-logs' ||
    pathNorm === '/admin/service-corrections';
  const hideBreadcrumbs =
    isExecutiveHome ||
    pathNorm === '/admin/analytics' ||
    pathNorm === '/admin/trends' ||
    pathNorm === '/admin/reports-heatmap' ||
    pathNorm === '/admin/classification-accuracy' ||
    isPaineisSection ||
    isUrbanReportsSection ||
    isEquipmentRatingsSection ||
    isPublicHearingsSection ||
    isPlatformSection ||
    isGovernanceSection;

  return (
    <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full min-w-0 max-w-screen-2xl">
        {!hideBreadcrumbs ? <AdminBreadcrumbs /> : null}
        <Outlet />
      </div>
    </main>
  );
}

function AdminAppShell() {
  const { pathname } = useLocation();
  const showUnifiedBar =
    USE_UNIFIED_ANALYTICS_CONTEXT_BAR && usesUnifiedAnalyticsBar(pathname);

  return (
    <AdminShell>
      <AdminHeader
        showAnalyticsFilters={showUnifiedBar}
        hideBreadcrumbs={showUnifiedBar}
      />
      <AdminMain />
    </AdminShell>
  );
}

export function AdminAppLayout() {
  return (
    <GlobalReportsAnalyticsProvider>
      <AnalyticsDrillProvider>
        <ReferralRoutingRulesProvider>
          <CustomPanelsProvider>
            <AdminAppShell />
            <ReportDrillSheet />
          </CustomPanelsProvider>
        </ReferralRoutingRulesProvider>
      </AnalyticsDrillProvider>
    </GlobalReportsAnalyticsProvider>
  );
}
