import { toast } from "sonner";
import { SettingsLayout } from "@/components/admin/settings/SettingsLayout";
import { useConfigEnvironment } from "@/contexts/ConfigEnvironmentContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SystemParametersPage() {
  const { config, environmentLabel } = useConfigEnvironment();

  return (
    <SettingsLayout
      title="Parametrização geral"
      description="Parâmetros de negócio por ambiente (produção e homologação), com validação no backend."
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Chave</th>
              <th className="px-4 py-3">Rótulo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Escopo</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {config.parameters.map((p) => (
              <tr key={p.key} className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{p.key}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </td>
                <td className="px-4 py-3">
                  {p.type === "boolean" ? (
                    <Badge variant={p.value ? "default" : "outline"}>
                      {p.value ? "Ativo" : "Inativo"}
                    </Badge>
                  ) : (
                    <span className="tabular-nums font-medium">{String(p.value)}</span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{p.scope}</td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toast.success("Parâmetro atualizado", {
                        description: `${p.key} — ${environmentLabel}.`,
                      })
                    }
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsLayout>
  );
}
