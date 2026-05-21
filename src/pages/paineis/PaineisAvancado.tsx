import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { PanelCanvas } from '@/components/panels/PanelCanvas';
import { PanelSelector } from '@/components/panels/PanelSelector';
import { PaineisAdvancedChartSection } from '@/components/admin/charts/SectionChartPanels';
import { PaineisExploreLinks } from '@/components/admin/paineis-page/PaineisExploreLinks';
import { PaineisPageHeader } from '@/components/admin/paineis-page/PaineisPageHeader';
import { PaineisSubNav } from '@/components/admin/paineis-page/PaineisSubNav';
import { PaineisSummaryStrip } from '@/components/admin/paineis-page/PaineisSummaryStrip';
import { Button } from '@/components/ui/button';
import { PAINEIS_AVANCADO_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { useCustomPanels } from '@/contexts/CustomPanelsContext';

export function PaineisAvancado() {
  const { activePanel } = useCustomPanels();

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PaineisPageHeader
        title="Modo foco"
        legends={PAINEIS_AVANCADO_PAGE_LEGENDS}
        ariaLabel="Ajuda sobre o modo foco de painéis"
        actions={
          activePanel ? (
            <Button variant="outline" size="sm" className="gap-1.5 shadow-sm" asChild>
              <Link to={`/paineis/criar/${activePanel.id}`}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Editar painel
              </Link>
            </Button>
          ) : null
        }
      />

      <PaineisSubNav />

      <PaineisSummaryStrip />

      <section aria-label="Painel em modo foco" className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <PanelSelector compact />
        </div>

        {activePanel ? (
          <div className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-muted/[0.15] p-3 md:p-4">
            <PanelCanvas panel={activePanel} mode="view" />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Selecione um painel acima ou{' '}
            <Link to="/paineis" className="font-medium text-foreground underline-offset-2 hover:underline">
              volte para Meus painéis
            </Link>
            .
          </p>
        )}
      </section>

      <PaineisAdvancedChartSection />

      <PaineisExploreLinks />
    </div>
  );
}
