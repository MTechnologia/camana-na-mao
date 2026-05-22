import { useMemo, useState } from 'react';
import { Download, CalendarClock } from 'lucide-react';
import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import { PlatformContentCard } from '@/components/admin/platform/PlatformContentCard';
import { EXPORTS_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { PlatformPageHeader } from '@/components/admin/platform/PlatformPageHeader';
import { PlatformSectionHeading } from '@/components/admin/platform/PlatformSectionHeading';
import { PlatformSubNav } from '@/components/admin/platform/PlatformSubNav';
import { Button } from '@/components/ui/button';
import { ExportsChartSection } from '@/components/admin/charts/SectionChartPanels';
import { ExportLogsTable } from '@/components/admin/exports/ExportLogsTable';
import { DataExportDialog } from '@/components/analytics/DataExportDialog';
import { ExportJobsPanel } from '@/components/analytics/ExportJobsPanel';
import { ScheduleExportDialog } from '@/components/analytics/ScheduleExportDialog';
import { getDefaultExportScheduleConfig } from '@/lib/exportFields';

export function ExportLogsPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const defaultScheduleConfig = useMemo(() => getDefaultExportScheduleConfig(), []);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PlatformPageHeader
        title="Exportações de dados"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setJobsOpen(true)}>
              Minhas exportações
            </Button>
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              <CalendarClock className="mr-2 h-4 w-4" aria-hidden />
              Agendar
            </Button>
            <Button size="sm" onClick={() => setExportOpen(true)}>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Nova exportação
            </Button>
          </div>
        }
      />

      <PlatformSubNav />

      <section className="space-y-3">
        <PlatformSectionHeading title="Resumo por formato" />
        <ExportsChartSection />
      </section>

      <section className="space-y-3">
        <PlatformSectionHeading title="Histórico de exportações" />
        <PlatformContentCard bodyClassName="p-0">
          <ExportLogsTable />
        </PlatformContentCard>
      </section>

      <DataExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ExportJobsPanel open={jobsOpen} onOpenChange={setJobsOpen} />
      <ScheduleExportDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultConfig={defaultScheduleConfig}
      />

      <PageUsageGuideFooter items={EXPORTS_PAGE_LEGENDS} pageName="Exportações de dados" />
    </div>
  );
}
