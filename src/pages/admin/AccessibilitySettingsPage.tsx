import { AccessibilityChartSection } from '@/components/admin/charts/SectionChartPanels';
import { PlatformAdminNotice } from '@/components/admin/platform/PlatformAdminNotice';
import { PlatformPageHeader } from '@/components/admin/platform/PlatformPageHeader';
import { PlatformSectionHeading } from '@/components/admin/platform/PlatformSectionHeading';
import { PlatformSubNav } from '@/components/admin/platform/PlatformSubNav';

export function AccessibilitySettingsPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PlatformPageHeader title="Acessibilidade (sistema)" />
      <PlatformSubNav />
      <PlatformAdminNotice />
      <section className="space-y-3">
        <PlatformSectionHeading title="Adoção de recursos" />
        <AccessibilityChartSection />
      </section>
    </div>
  );
}
