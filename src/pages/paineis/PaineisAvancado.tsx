import { Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { PanelCanvas } from "@/components/panels/PanelCanvas";
import { PanelSelector } from "@/components/panels/PanelSelector";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/PageShell";
import { useCustomPanels } from "@/contexts/CustomPanelsContext";

export function PaineisAvancado() {
  const { activePanel } = useCustomPanels();

  return (
    <PageShell
      title="Painel avançado"
      description="Visualização em modo foco do painel selecionado, com drill-down por widget e filtros globais sincronizados."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PanelSelector compact />
          {activePanel ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/paineis/criar/${activePanel.id}`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Link>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/paineis">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Meus painéis
            </Link>
          </Button>
        </div>
      }
    >
      {activePanel ? (
        <PanelCanvas panel={activePanel} mode="view" />
      ) : (
        <p className="text-sm text-muted-foreground">
          Selecione um painel acima ou{" "}
          <Link to="/paineis" className="text-primary underline-offset-2 hover:underline">
            volte para Meus painéis
          </Link>
          .
        </p>
      )}
    </PageShell>
  );
}
