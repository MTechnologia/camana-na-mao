import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAnalyticsDrill } from "@/contexts/AnalyticsDrillContext";
import { useReportDetailModal } from "@/contexts/ReportDetailContext";
import type { DrillReportSource } from "@/types/analyticsDrill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function sourceLabel(source: DrillReportSource): string {
  if (source === "urban") return "Urbano";
  if (source === "transport") return "Transporte";
  return "Avaliação";
}

export function ReportDrillSheet() {
  const {
    throughOpen,
    closeDrillThrough,
    throughReportsPage,
    throughTotal,
    throughPage,
    throughTotalPages,
    throughPageSize,
    setThroughPage,
    throughLoading,
    selectedBar,
  } = useAnalyticsDrill();
  const { open: openReport } = useReportDetailModal();

  if (!throughOpen || !selectedBar) return null;

  const showPagination = throughTotal > throughPageSize;
  const rangeStart = throughTotal === 0 ? 0 : (throughPage - 1) * throughPageSize + 1;
  const rangeEnd = Math.min(throughPage * throughPageSize, throughTotal);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Fechar painel de relatos"
        onClick={closeDrillThrough}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="drill-through-title"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 id="drill-through-title" className="text-sm font-semibold text-foreground">
              Detalhes — Relatos
            </h2>
            <p className="text-xs text-muted-foreground">Recorte: {selectedBar.label}</p>
            {!throughLoading && throughTotal > 0 ? (
              <p className="text-xs text-muted-foreground">
                {throughTotal} {throughTotal === 1 ? "relato" : "relatos"} no período
                {selectedBar.value > 0 && throughTotal !== Math.round(selectedBar.value) ? (
                  <span className="block text-amber-700 dark:text-amber-400">
                    Gráfico: {Math.round(selectedBar.value).toLocaleString("pt-BR")} · listados:{" "}
                    {throughTotal.toLocaleString("pt-BR")}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closeDrillThrough}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {throughLoading ? (
            <p className="text-sm text-muted-foreground">Carregando relatos…</p>
          ) : throughTotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum relato encontrado para este recorte no período selecionado.
            </p>
          ) : (
            <ul className="space-y-2">
              {throughReportsPage.map((r) => {
                const clickable = r.source === "urban" || r.source === "transport";
                return (
                  <li
                    key={`${r.source}-${r.id}`}
                    className={cn(
                      "rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm",
                      clickable &&
                        "cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/50",
                    )}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={() => {
                      if (clickable) openReport(r.id, r.source);
                    }}
                    onKeyDown={(e) => {
                      if (clickable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        openReport(r.id, r.source);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                      <div className="flex shrink-0 gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {sourceLabel(r.source)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.createdAt}</p>
                    {clickable ? (
                      <p className="mt-1 text-xs text-primary">Abrir detalhes do relato →</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {showPagination && !throughLoading ? (
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
            <p className="text-center text-xs text-muted-foreground">
              Exibindo {rangeStart}–{rangeEnd} de {throughTotal}
            </p>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={throughPage <= 1}
                onClick={() => setThroughPage(Math.max(1, throughPage - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                Anterior
              </Button>
              <span className="shrink-0 text-xs text-muted-foreground">
                Página {throughPage} de {throughTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={throughPage >= throughTotalPages}
                onClick={() => setThroughPage(Math.min(throughTotalPages, throughPage + 1))}
              >
                Próxima
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="border-t border-border p-4">
          <Link
            to="/admin/reports"
            onClick={closeDrillThrough}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Abrir gestão de relatos
          </Link>
        </div>
      </aside>
    </>
  );
}
