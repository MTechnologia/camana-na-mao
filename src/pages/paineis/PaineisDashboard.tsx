import { Link } from 'react-router-dom';
import { Maximize2, PlusCircle } from 'lucide-react';
import { PanelCanvas } from '@/components/panels/PanelCanvas';
import { PanelSelector } from '@/components/panels/PanelSelector';
import {
  PaineisOverviewChartSection,
} from '@/components/admin/charts/SectionChartPanels';
import { PaineisExploreLinks } from '@/components/admin/paineis-page/PaineisExploreLinks';
import { PaineisPageHeader } from '@/components/admin/paineis-page/PaineisPageHeader';
import { PaineisSubNav } from '@/components/admin/paineis-page/PaineisSubNav';
import { PaineisSummaryStrip } from '@/components/admin/paineis-page/PaineisSummaryStrip';
import { Button } from '@/components/ui/button';
import { PAINEIS_INDEX_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { useCustomPanels } from '@/contexts/CustomPanelsContext';

export function PaineisDashboard() {
  const { activePanel } = useCustomPanels();

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PaineisPageHeader
        title="Meus painéis"
        legends={PAINEIS_INDEX_PAGE_LEGENDS}
        ariaLabel="Ajuda sobre meus painéis"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5 shadow-sm" asChild>
              <Link to="/paineis/avancado">
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                Modo foco
              </Link>
            </Button>
            <Button size="sm" className="gap-1.5 shadow-sm" asChild>
              <Link to="/paineis/criar">
                <PlusCircle className="h-3.5 w-3.5" aria-hidden />
                Criar painel
              </Link>
            </Button>
          </>
        }
      />

      <PaineisSubNav />

      <PaineisSummaryStrip />

      <section aria-label="Seleção de painéis" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Seus painéis</h2>
        <PanelSelector />
      </section>

      {activePanel ? (
        <section aria-label="Painel ativo" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{activePanel.name}</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/paineis/criar/${activePanel.id}`}>Editar layout</Link>
            </Button>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-muted/[0.15] p-3 md:p-4">
            <PanelCanvas panel={activePanel} mode="view" />
          </div>
        </section>
      ) : null}

      <PaineisOverviewChartSection />

      <PaineisExploreLinks />
    </div>
  );
}
