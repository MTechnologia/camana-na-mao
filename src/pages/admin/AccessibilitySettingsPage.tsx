import { AccessibilityChartSection } from '@/components/admin/charts/SectionChartPanels';
import { PageShell } from '@/components/ui/PageShell';

export function AccessibilitySettingsPage() {
  return (
    <PageShell
      title="Acessibilidade (sistema)"
      description="Parâmetros institucionais de contraste, tamanho de fonte padrão e recursos globais."
    >
      <AccessibilityChartSection />
    </PageShell>
  );
}
