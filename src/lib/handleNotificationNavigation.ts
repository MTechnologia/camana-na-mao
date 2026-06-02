import { toast } from "sonner";
import { downloadExportJobById, exportDownloadPath } from "@/lib/exportJobDownload";

export type NotificationNavItem = {
  id: string;
  type: string;
  action_url?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Trata clique em notificação: exportações concluídas disparam download;
 * demais tipos seguem action_url.
 */
export async function handleNotificationNavigation(
  notification: NotificationNavItem,
  navigate: (path: string) => void,
): Promise<void> {
  if (notification.type === "export_completed") {
    const jobId =
      typeof notification.metadata?.jobId === "string" ? notification.metadata.jobId : null;

    if (jobId) {
      const { ok, error } = await downloadExportJobById(jobId);
      if (ok) {
        toast.success("Download iniciado. O arquivo abre em uma nova aba.");
        navigate(exportDownloadPath(jobId));
        return;
      }
      toast.error(error ?? "Não foi possível baixar a exportação.");
      navigate(exportDownloadPath(jobId));
      return;
    }
  }

  const url = notification.action_url?.trim();
  if (url) {
    navigate(url.startsWith("/") ? url : `/${url}`);
  }
}
