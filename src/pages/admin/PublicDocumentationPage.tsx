import { DocumentationChartSection } from '@/components/admin/charts/SectionChartPanels';
import { GovernancePageShell } from '@/components/admin/governance/GovernancePageShell';
import { PlatformSectionHeading } from '@/components/admin/platform/PlatformSectionHeading';

export function PublicDocumentationPage() {
  return (
    <GovernancePageShell title="Documentação">
      <section className="space-y-3">
        <PlatformSectionHeading title="Acessos por módulo" />
        <DocumentationChartSection />
      </section>

      <section className="space-y-3">
        <PlatformSectionHeading title="Guia rápido do gestor" />
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm md:p-5">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Ajuste período, região e categoria na barra superior — os KPIs analíticos obedecem
              esse recorte.
            </li>
            <li>
              Relatos urbanos: análise multidimensional e gestão com triagem. Avaliações de
              equipamentos e audiências públicas têm menus próprios.
            </li>
            <li>Fluxo operacional: triagem → comissão → acompanhamento em Encaminhamentos.</li>
          </ol>
        </div>
      </section>
    </GovernancePageShell>
  );
}
