import { useState } from "react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutList, ChevronDown, ChevronUp } from "lucide-react";
import { COMISSOES, type Comissao } from "@/data/comissoes";

const ComissaoCard = ({ comissao }: { comissao: Comissao }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{comissao.nome}</h3>
            {comissao.sigla && (
              <Badge variant="secondary" className="text-xs">
                {comissao.sigla}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">
              {comissao.tipo}
            </Badge>
          </div>
          <p
            className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}
          >
            {comissao.atribuicoes}
          </p>
        </div>
        <button
          type="button"
          className="p-1 rounded hover:bg-muted shrink-0"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </Card>
  );
};

const Comissoes = () => {
  const permanentes = COMISSOES.filter((c) => c.tipo === "permanente");
  const especiais = COMISSOES.filter((c) => c.tipo === "especial");

  return (
    <InstitutionalLayout title="Comissões" category="Institucional">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Comissões da Câmara Municipal
          </h1>
          <p className="text-muted-foreground">
            As comissões analisam projetos de lei por tema e emitem pareceres
            antes da votação no plenário. Conheça as atribuições de cada uma.
          </p>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-primary" />
            Comissões permanentes
          </h2>
          <div className="space-y-3">
            {permanentes.map((c) => (
              <ComissaoCard key={c.id} comissao={c} />
            ))}
          </div>
        </section>

        {especiais.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-primary" />
              Comissões especiais
            </h2>
            <div className="space-y-3">
              {especiais.map((c) => (
                <ComissaoCard key={c.id} comissao={c} />
              ))}
            </div>
          </section>
        )}

        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>
            <strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo
          </p>
          <p>
            <strong>Atualização:</strong> Lista e atribuições alinhadas à base de
            conhecimento do assistente virtual. Dados dinâmicos (membros,
            reuniões) podem ser integrados no futuro via API ComissoesCMSPJSON.
          </p>
        </div>
      </div>
    </InstitutionalLayout>
  );
};

export default Comissoes;
