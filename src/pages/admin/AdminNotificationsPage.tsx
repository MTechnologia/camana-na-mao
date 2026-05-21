import { NotificationsChartSection } from '@/components/admin/charts/SectionChartPanels';
import { PlatformPageHeader } from '@/components/admin/platform/PlatformPageHeader';
import { PlatformSectionHeading } from '@/components/admin/platform/PlatformSectionHeading';
import { PlatformSubNav } from '@/components/admin/platform/PlatformSubNav';

export function AdminNotificationsPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PlatformPageHeader title="Notificações" />
      <PlatformSubNav />
      <section className="space-y-3">
        <PlatformSectionHeading title="Entregas de notificações" />
        <NotificationsChartSection />
      </section>
    </div>
  );
}
