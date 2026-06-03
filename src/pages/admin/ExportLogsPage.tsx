import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { downloadExportJobById } from "@/lib/exportJobDownload";
import { PageShell } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPORTS_PAGE_LEGEND } from "@/lib/analyticsParameterLegends";
import { ExportsChartSection } from "@/components/admin/charts/SectionChartPanels";
import { ExportLogsTable } from "@/components/admin/exports/ExportLogsTable";
import { DataExportDialog } from "@/components/analytics/DataExportDialog";
import { ExportJobsPanel } from "@/components/analytics/ExportJobsPanel";
import { ScheduleExportDialog } from "@/components/analytics/ScheduleExportDialog";
import { getDefaultExportScheduleConfig } from "@/lib/exportFields";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

export function ExportLogsPage() {
  const { canExportData, loading } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exportOpen, setExportOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const autoDownloadHandled = useRef<string | null>(null);
  const defaultScheduleConfig = useMemo(() => getDefaultExportScheduleConfig(), []);

  const jobIdFromUrl = searchParams.get("jobId");

  useEffect(() => {
    if (!jobIdFromUrl || autoDownloadHandled.current === jobIdFromUrl) return;
    autoDownloadHandled.current = jobIdFromUrl;
    setJobsOpen(true);
    void downloadExportJobById(jobIdFromUrl).then(({ ok, error }) => {
      if (ok) {
        toast.success("Download da exportação agendada iniciado.");
      } else if (error) {
        toast.error(error);
      }
      const next = new URLSearchParams(searchParams);
      next.delete("jobId");
      setSearchParams(next, { replace: true });
    });
  }, [jobIdFromUrl, searchParams, setSearchParams]);

  if (!loading && !canExportData) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <PageShell
      title="Exportações"
      description="Exportações em CSV / XLS / XLSX com recorte, granularidade, campos e ordenação (RN-EXP-001). Jobs agendados com histórico (RN-EXP-002)."
      titleInfo={EXPORTS_PAGE_LEGEND}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setJobsOpen(true)}>
            Minhas exportações
          </Button>
          <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Agendar
          </Button>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Nova exportação
          </Button>
        </div>
      }
    >
      <ExportsChartSection />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Histórico de exportações</CardTitle>
          <p className="text-sm text-muted-foreground">
            Todas as exportações realizadas no sistema, com tipo, formato e status.
          </p>
        </CardHeader>
        <CardContent>
          <ExportLogsTable />
        </CardContent>
      </Card>

      <DataExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ExportJobsPanel open={jobsOpen} onOpenChange={setJobsOpen} />
      <ScheduleExportDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultConfig={defaultScheduleConfig}
      />
    </PageShell>
  );
}
