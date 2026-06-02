import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CrossMatrix, ReportCategory } from "@/hooks/useDemographicCrossAnalytics";

/**
 * HU-3.4 — Heatmap de cruzamento Categoria × Demografia.
 *
 * Linhas = tipos de problema (Urbano / Transporte / Avaliação).
 * Colunas = valores do eixo demográfico (Gênero / Raça / etc).
 * Células com gradiente de cor (claro → escuro) proporcional à contagem.
 *
 * Mobile-first: tabela com scroll horizontal quando há muitas colunas.
 * Click em célula dispara `onCellClick` para drill-into.
 */

export interface DemographicHeatmapProps {
  matrix: CrossMatrix;
  isLoading?: boolean;
  /** Callback quando uma célula é clicada (não dispara em células zeradas). */
  onCellClick?: (
    category: ReportCategory,
    demoValue: string,
    demoLabel: string,
    count: number,
  ) => void;
  /** Texto do título da coluna de categorias (default "Tipo de relato"). */
  rowHeaderLabel?: string;
}

/**
 * Calcula a intensidade da cor (0-1) baseada na contagem da célula em
 * relação ao máximo da matriz. Usa raiz quadrada para suavizar a
 * distribuição e evitar que uma célula muito grande "ofusque" o resto.
 */
function intensity(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0;
  return Math.sqrt(count / max);
}

function cellBgClass(intensityValue: number): string {
  if (intensityValue === 0) return "bg-muted/40";
  if (intensityValue < 0.2) return "bg-primary/10";
  if (intensityValue < 0.4) return "bg-primary/25";
  if (intensityValue < 0.6) return "bg-primary/40";
  if (intensityValue < 0.8) return "bg-primary/60 text-primary-foreground";
  return "bg-primary text-primary-foreground";
}

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function DemographicHeatmap({
  matrix,
  isLoading,
  onCellClick,
  rowHeaderLabel = "Tipo de relato",
}: DemographicHeatmapProps) {
  if (isLoading && matrix.total === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (matrix.total === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Sem dados demográficos suficientes para este recorte.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full border-collapse text-sm min-w-[480px]">
        <thead>
          <tr>
            <th
              scope="col"
              className="text-left font-medium px-2 py-2 sticky left-0 bg-background z-10 min-w-[140px]"
            >
              {rowHeaderLabel}
            </th>
            {matrix.demoValues.map((dv) => (
              <th
                key={dv.value}
                scope="col"
                className="text-center font-medium px-1 py-2 text-xs whitespace-nowrap"
                title={`${dv.label}: ${matrix.colTotals[dv.value] ?? 0} relatos no total`}
              >
                <div className="flex flex-col items-center">
                  <span className="font-semibold">{dv.label}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {matrix.colTotals[dv.value] ?? 0} (
                    {pct(matrix.colTotals[dv.value] ?? 0, matrix.total)})
                  </span>
                </div>
              </th>
            ))}
            <th scope="col" className="text-right font-medium px-2 py-2 text-xs whitespace-nowrap">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {matrix.categories.map((cat) => {
            const rowTotal = matrix.rowTotals[cat] ?? 0;
            return (
              <tr key={cat} className="border-t">
                <th
                  scope="row"
                  className="text-left font-medium px-2 py-2 sticky left-0 bg-background z-10 align-middle"
                >
                  <div className="flex flex-col">
                    <span>{cat}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {rowTotal} ({pct(rowTotal, matrix.total)})
                    </span>
                  </div>
                </th>
                {matrix.demoValues.map((dv) => {
                  const count = matrix.cells[`${cat}|${dv.value}`] ?? 0;
                  const i = intensity(count, matrix.maxCount);
                  const clickable = count > 0 && !!onCellClick;
                  return (
                    <td
                      key={dv.value}
                      className={cn(
                        "text-center align-middle px-1 py-2 transition-colors",
                        cellBgClass(i),
                        clickable && "cursor-pointer hover:ring-2 hover:ring-primary/60",
                      )}
                      onClick={() => {
                        if (clickable) onCellClick?.(cat, dv.value, dv.label, count);
                      }}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (clickable && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          onCellClick?.(cat, dv.value, dv.label, count);
                        }
                      }}
                      aria-label={`${cat} × ${dv.label}: ${count} relato${count === 1 ? "" : "s"}`}
                      title={`${cat} × ${dv.label}: ${count} (${pct(count, rowTotal)} da linha, ${pct(count, matrix.colTotals[dv.value] ?? 0)} da coluna)`}
                    >
                      <span className="font-semibold tabular-nums">{count}</span>
                    </td>
                  );
                })}
                <td className="text-right px-2 py-2 font-semibold tabular-nums">{rowTotal}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30">
            <th
              scope="row"
              className="text-left font-medium px-2 py-2 sticky left-0 bg-muted/30 z-10"
            >
              Total
            </th>
            {matrix.demoValues.map((dv) => (
              <td key={dv.value} className="text-center px-1 py-2 font-semibold tabular-nums">
                {matrix.colTotals[dv.value] ?? 0}
              </td>
            ))}
            <td className="text-right px-2 py-2 font-bold tabular-nums">{matrix.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Helpers exportados para teste
export const __test__ = { intensity, cellBgClass };
