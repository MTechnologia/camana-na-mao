import { DocumentationChartSection } from '@/components/admin/charts/SectionChartPanels';
import { PageShell } from '@/components/ui/PageShell';

export function PublicDocumentationPage() {
  return (
    <PageShell
      title="Documentação"
      description="Visão geral pública / institucional do painel. Pode apontar para conteúdo Markdown ou portal externo."
    >
      <DocumentationChartSection />
      <article className="mt-6 max-w-none rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Guia rápido do gestor</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Ajuste período, região e categoria na barra superior — todos os KPIs devem obedecê-los.</li>
          <li>
            Relatos urbanos: análise multidimensional e gestão com triagem. Avaliações de equipamentos e
            audiências públicas têm menus próprios.
          </li>
          <li>Fluxo operacional: triagem → comissão → acompanhamento em Encaminhamentos.</li>
        </ol>
      </article>
    </PageShell>
  );
}
