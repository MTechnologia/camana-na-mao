import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminBreadcrumbs } from "@/components/admin/AnalyticsContextBar";
import { UnifiedAnalyticsContextBar } from "@/components/admin/UnifiedAnalyticsContextBar";
import { AdminShell } from "@/components/admin/AdminSidebar";
import { ReportDetailSheet } from "@/components/admin/ReportDetailSheet";
import { USE_UNIFIED_ANALYTICS_CONTEXT_BAR } from "@/config/analyticsUi";
import { ReportDetailProvider } from "@/contexts/ReportDetailContext";
import { usesUnifiedAnalyticsBar } from "@/lib/adminRouteUtils";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { pathname } = useLocation();
  const showUnifiedBar = USE_UNIFIED_ANALYTICS_CONTEXT_BAR && usesUnifiedAnalyticsBar(pathname);

  return (
    <ReportDetailProvider>
      <AdminShell>
        {showUnifiedBar ? <UnifiedAnalyticsContextBar /> : null}
        <AdminHeader hideMobileMenu={showUnifiedBar} hideBreadcrumbs={showUnifiedBar} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full min-w-0 max-w-screen-2xl">
            {showUnifiedBar ? <AdminBreadcrumbs /> : null}
            {children}
          </div>
        </main>
      </AdminShell>
      <ReportDetailSheet />
    </ReportDetailProvider>
  );
};
