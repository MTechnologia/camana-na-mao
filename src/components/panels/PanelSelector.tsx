import { Check, Copy, LayoutGrid, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCustomPanels } from "@/contexts/CustomPanelsContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PanelSelector({ compact }: { compact?: boolean }) {
  const { panels, activePanelId, setActivePanelId, deletePanel, duplicatePanel } =
    useCustomPanels();

  if (panels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum painel salvo.{" "}
        <Link
          to="/paineis/criar"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Criar o primeiro
        </Link>
      </p>
    );
  }

  if (compact) {
    return (
      <select
        className="flex h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
        value={activePanelId ?? ""}
        onChange={(e) => setActivePanelId(e.target.value || null)}
        aria-label="Selecionar painel"
      >
        {panels.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {panels.map((panel) => {
        const active = panel.id === activePanelId;
        return (
          <li key={panel.id}>
            <div
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => setActivePanelId(panel.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActivePanelId(panel.id);
                }
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30 hover:bg-muted/30",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutGrid className="h-5 w-5" aria-hidden />
                </span>
                {active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    <Check className="h-3 w-3" />
                    Ativo
                  </span>
                ) : null}
              </span>
              <span className="mt-3 font-semibold text-foreground">{panel.name}</span>
              {panel.description ? (
                <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {panel.description}
                </span>
              ) : null}
              <span className="mt-2 text-xs text-muted-foreground">
                {panel.widgets.length} widget{panel.widgets.length === 1 ? "" : "s"}
              </span>
              <span className="mt-3 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                  <Link to={`/paineis/criar/${panel.id}`}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => duplicatePanel(panel.id)}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Duplicar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    if (panels.length <= 1) return;
                    if (window.confirm(`Excluir o painel "${panel.name}"?`)) deletePanel(panel.id);
                  }}
                  disabled={panels.length <= 1}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Excluir
                </Button>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
