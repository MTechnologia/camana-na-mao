import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnalyticsDrillProvider } from "@/contexts/AnalyticsDrillContext";
import { AnalyticsLiveProvider } from "@/contexts/AnalyticsLiveContext";
import { GlobalReportsAnalyticsProvider } from "@/contexts/GlobalReportsAnalyticsContext";
import { CustomPanelsProvider } from "@/contexts/CustomPanelsContext";
import { ReferralRoutingRulesProvider } from "@/contexts/ReferralRoutingRulesContext";
import { AdminShell } from "@/components/admin/AdminSidebar";
import { USE_UNIFIED_ANALYTICS_CONTEXT_BAR } from "@/config/analyticsUi";
import { AdminBreadcrumbs } from "@/components/admin/AnalyticsContextBar";
import { UnifiedAnalyticsContextBar } from "@/components/admin/UnifiedAnalyticsContextBar";
import { usesGlobalReportsAnalytics, usesUnifiedAnalyticsBar } from "@/lib/adminRouteUtils";
import { ReportDrillSheet } from "@/components/admin/analytics/ReportDrillSheet";
import { ReportDetailSheet } from "@/components/admin/ReportDetailSheet";
import { ReportDetailProvider } from "@/contexts/ReportDetailContext";

function AdminMain() {
  return (
    <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-24 md:p-6 md:pb-24">
      <AdminBreadcrumbs />
      <Outlet />
    </main>
  );
}

function normalizeAdminPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function ConditionalGlobalAnalytics({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const path = normalizeAdminPath(pathname);
  const enabled = usesGlobalReportsAnalytics(path);
  if (!enabled) return <>{children}</>;
  return <GlobalReportsAnalyticsProvider>{children}</GlobalReportsAnalyticsProvider>;
}

export function AdminAppLayout() {
  const { pathname } = useLocation();
  const showUnifiedBar = USE_UNIFIED_ANALYTICS_CONTEXT_BAR && usesUnifiedAnalyticsBar(pathname);

  return (
    <ReportDetailProvider>
      <AnalyticsLiveProvider>
        <ConditionalGlobalAnalytics>
          <AnalyticsDrillProvider>
            <ReferralRoutingRulesProvider>
              <CustomPanelsProvider>
                <AdminShell>
                  {showUnifiedBar ? <UnifiedAnalyticsContextBar /> : null}
                  <AdminMain />
                </AdminShell>
                <ReportDrillSheet />
                <ReportDetailSheet />
              </CustomPanelsProvider>
            </ReferralRoutingRulesProvider>
          </AnalyticsDrillProvider>
        </ConditionalGlobalAnalytics>
      </AnalyticsLiveProvider>
    </ReportDetailProvider>
  );
}
