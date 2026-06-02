import { NotificationsChartSection } from "@/components/admin/charts/SectionChartPanels";
import { PageShell } from "@/components/ui/PageShell";

export function AdminNotificationsPage() {
  return (
    <PageShell
      title="Notificações administrativas"
      description="Envio e acompanhamento de avisos operacionais (integração futura com Edge Functions / push)."
    >
      <NotificationsChartSection />
    </PageShell>
  );
}
