import { Navigate, useParams } from 'react-router-dom';
import { PanelBuilder } from '@/components/panels/PanelBuilder';
import { PaineisCreateChartSection } from '@/components/admin/charts/SectionChartPanels';
import { PaineisExploreLinks } from '@/components/admin/paineis-page/PaineisExploreLinks';
import { PaineisPageHeader } from '@/components/admin/paineis-page/PaineisPageHeader';
import { PaineisSubNav } from '@/components/admin/paineis-page/PaineisSubNav';
import { PAINEIS_CRIAR_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { useCustomPanels } from '@/contexts/CustomPanelsContext';

export function PaineisCriar() {
  const { panelId } = useParams<{ panelId?: string }>();
  const { getPanelById } = useCustomPanels();

  const editing = panelId ? getPanelById(panelId) : undefined;

  if (panelId && !editing) {
    return <Navigate to="/paineis/criar" replace />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PaineisPageHeader
        title={editing ? 'Editar painel' : 'Criar painel'}
        legends={PAINEIS_CRIAR_PAGE_LEGENDS}
        ariaLabel="Ajuda sobre criar e editar painéis"
      />

      <PaineisSubNav />

      <PanelBuilder key={editing?.id ?? 'new'} initialPanel={editing} />

      <PaineisCreateChartSection />

      <PaineisExploreLinks />
    </div>
  );
}
