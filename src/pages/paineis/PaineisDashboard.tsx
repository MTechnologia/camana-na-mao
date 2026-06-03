import { Link } from "react-router-dom";
import { Maximize2, PlusCircle } from "lucide-react";
import { PanelCanvas } from "@/components/panels/PanelCanvas";
import { PanelSelector } from "@/components/panels/PanelSelector";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/PageShell";
import { useCustomPanels } from "@/contexts/CustomPanelsContext";

export function PaineisDashboard() {
  const { activePanel } = useCustomPanels();

  return (
    <PageShell
      title="Meus painéis"
      description="Selecione um painel salvo para visualizar seu conjunto de widgets. Cada painel pode ter filtros globais (barra superior) e filtros por widget."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/paineis/avancado">
              <Maximize2 className="mr-1.5 h-4 w-4" />
              Modo foco
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/paineis/criar">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Criar painel
            </Link>
          </Button>
        </div>
      }
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Seus painéis</h2>
        <PanelSelector />
      </section>

      {activePanel ? (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{activePanel.name}</h2>
              {activePanel.description ? (
                <p className="text-sm text-muted-foreground">{activePanel.description}</p>
              ) : null}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/paineis/criar/${activePanel.id}`}>Editar layout</Link>
            </Button>
          </div>
          <PanelCanvas panel={activePanel} mode="view" />
        </section>
      ) : null}
    </PageShell>
  );
}
