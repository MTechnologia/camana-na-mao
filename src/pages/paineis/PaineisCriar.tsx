import { Navigate, useParams } from 'react-router-dom';
import { PanelBuilder } from '@/components/panels/PanelBuilder';
import { PageShell } from '@/components/ui/PageShell';
import { useCustomPanels } from '@/contexts/CustomPanelsContext';

export function PaineisCriar() {
  const { panelId } = useParams<{ panelId?: string }>();
  const { getPanelById } = useCustomPanels();

  const editing = panelId ? getPanelById(panelId) : undefined;

  if (panelId && !editing) {
    return <Navigate to="/paineis/criar" replace />;
  }

  return (
    <PageShell
      title={editing ? 'Editar painel' : 'Criar painel'}
      description="Monte widgets com filtros personalizados — estilo workspace: biblioteca à esquerda, canvas no centro e configuração à direita. Os dados seguem o mesmo motor de analytics do painel institucional."
    >
      <PanelBuilder key={editing?.id ?? 'new'} initialPanel={editing} />
    </PageShell>
  );
}
