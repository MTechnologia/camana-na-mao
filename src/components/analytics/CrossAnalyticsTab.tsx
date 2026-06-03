import { useMemo } from "react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { useRegisterAnalyticsLive } from "@/hooks/useRegisterAnalyticsLive";
import { globalFiltersToReportsAnalytics } from "@/lib/globalFiltersToAnalytics";
import { regionLabel } from "@/lib/analyticsLabels";
import { GitMerge, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DemographicHeatmap } from "@/components/analytics/DemographicHeatmap";
import {
  useCrossDimensionAnalytics,
  type CrossCellMatrix,
} from "@/hooks/useCrossDimensionAnalytics";
import { useDrillInsight } from "@/hooks/useDrillInsight";
import { DrillInsightPanel } from "@/components/analytics/DrillInsightPanel";
import { useUrlSyncedState, type FieldSerializer } from "@/hooks/useUrlSyncedState";
import { DIMENSIONS, DIMENSION_KEYS, type DimensionKey } from "@/lib/analyticsDimensions";
import type { CrossMatrix, ReportCategory } from "@/hooks/useDemographicCrossAnalytics";
import { cn } from "@/lib/utils";

/**
 * HU-3.5 — Aba "Cruzamentos" expandida para drill-across N×N.
 *
 * O usuário escolhe LINHA e COLUNA entre 13 dimensões analíticas (categoria,
 * status, severidade, zona, tempo, sentimento, demografia, fonte). A matriz
 * resultante é exibida no DemographicHeatmap (componente reusado da HU-3.4).
 *
 * Click em célula abre o DrillInsightPanel com os relatos que cruzam ambas
 * as dimensões da célula. URL state preserva ambas as escolhas
 * (?cross.row=, ?cross.col=).
 */

// Serializadores que aceitam qualquer DimensionKey conhecida
function dimensionSerializer(defaultValue: DimensionKey): FieldSerializer<DimensionKey> {
  return {
    toParam: (v) => (v === defaultValue ? null : v),
    fromParam: (raw) => {
      if (raw && (DIMENSION_KEYS as readonly string[]).includes(raw)) return raw as DimensionKey;
      return defaultValue;
    },
  };
}

/**
 * Adapta a matriz N×N do useCrossDimensionAnalytics para o formato CrossMatrix
 * esperado pelo DemographicHeatmap (que tem tipos da HU-3.4). O cast é seguro
 * porque ambos os formatos guardam contagens em \`cells: Record<string, number>\`.
 */
function adaptMatrixForHeatmap(m: CrossCellMatrix): CrossMatrix {
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  m.rowValues.forEach((r) => (rowTotals[r.value] = r.total));
  m.colValues.forEach((c) => (colTotals[c.value] = c.total));
  return {
    axis: "gender",
    categories: m.rowValues.map((r) => r.label) as ReportCategory[],
    demoValues: m.colValues.map((c) => ({ value: c.value, label: c.label })),
    cells: m.rowValues.reduce<Record<string, number>>((acc, r) => {
      m.colValues.forEach((c) => {
        const k = `${r.label}|${c.value}`;
        acc[k] = m.cells[`${r.value}|${c.value}`] || 0;
      });
      return acc;
    }, {}),
    maxCount: m.maxCount,
    total: m.total,
    rowTotals: m.rowValues.reduce<Record<ReportCategory, number>>(
      (acc, r) => {
        (acc as Record<string, number>)[r.label] = r.total;
        return acc;
      },
      {} as Record<ReportCategory, number>,
    ),
    colTotals,
  };
}

export type CrossAnalyticsTabProps = {
  /** Namespace dos parâmetros na URL (?exec.row=, ?exec.col=). */
  urlPrefix?: string;
  /** Dimensão inicial da linha (HU-3.4: category). */
  defaultRow?: DimensionKey;
  /** Dimensão inicial da coluna (HU-3.4: gender). */
  defaultCol?: DimensionKey;
};

export function CrossAnalyticsTab({
  urlPrefix = "cross",
  defaultRow = "category",
  defaultCol = "gender",
}: CrossAnalyticsTabProps = {}) {
  // URL state com 2 dimensões (default Categoria × Gênero — equivalente HU-3.4)
  const [state, setState] = useUrlSyncedState<{ row: DimensionKey; col: DimensionKey }>({
    prefix: urlPrefix,
    defaults: { row: defaultRow, col: defaultCol },
    serializers: {
      row: dimensionSerializer(defaultRow),
      col: dimensionSerializer(defaultCol),
    },
  });
  const rowDim = state.row;
  const colDim = state.col;

  const { period, region, category } = useGlobalFilters();
  const analyticsFilters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );

  const { matrix, reports, isLoading, error, lastUpdate, refresh, getReportsForCell } =
    useCrossDimensionAnalytics(rowDim, colDim, analyticsFilters);
  const drillInsight = useDrillInsight(analyticsFilters);

  useRegisterAnalyticsLive(
    "cross-analytics",
    { lastUpdate, refresh: () => void refresh() },
    urlPrefix === "exec",
  );

  const filterHint = useMemo(() => {
    const parts: string[] = [];
    if (period !== "ytd") {
      const labels: Record<string, string> = {
        compare: "Comparar períodos",
        last_7d: "Últimos 7 dias",
        last_30d: "Últimos 30 dias",
        last_90d: "Últimos 90 dias",
        ytd: "Ano corrente",
      };
      parts.push(labels[period] ?? period);
    }
    if (region !== "all") parts.push(regionLabel(region));
    if (category !== "all") parts.push(`Categoria: ${category}`);
    return parts.length > 0 ? parts.join(" · ") : "Mesmo recorte do topo do dashboard";
  }, [period, region, category]);

  const adapted = useMemo(() => adaptMatrixForHeatmap(matrix), [matrix]);
  const rowDef = DIMENSIONS[rowDim];
  const colDef = DIMENSIONS[colDim];

  const handleSwap = () => setState({ row: colDim, col: rowDim });

  const handleCellClick = (rowLabel: string, colValue: string, colLabel: string, count: number) => {
    // O heatmap trabalha com labels; aqui resolvemos de volta para values
    // sem assumir label único (pode haver colisão em dimensões diferentes).
    const rowCandidates = matrix.rowValues.filter((r) => r.label === rowLabel);
    const rowEntry =
      rowCandidates.length <= 1
        ? rowCandidates[0]
        : (rowCandidates.find((r) => (matrix.cells[`${r.value}|${colValue}`] || 0) === count) ??
          rowCandidates[0]);
    const colEntry = matrix.colValues.find((c) => c.label === colLabel);
    if (!rowEntry || !colEntry) return;
    const cellReports = getReportsForCell(rowEntry.value, colEntry.value);
    void drillInsight.searchByCrossCellReports(rowLabel, colLabel, cellReports);
  };

  return (
    <div className="space-y-4">
      {/* Header com seletores Linha / Coluna + Inverter + Atualizar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Cruzamento de dimensões
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Escolha a dimensão da linha e da coluna. {reports.length.toLocaleString("pt-BR")}{" "}
            relatos no recorte ({filterHint}).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Linha
              </label>
              <Select
                value={rowDim}
                onValueChange={(v) => setState({ row: v as DimensionKey, col: colDim })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSION_KEYS.map((k) => (
                    <SelectItem key={k} value={k} disabled={k === colDim}>
                      {DIMENSIONS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleSwap}
              aria-label="Inverter linha e coluna"
              title="Inverter eixos"
              className="self-end md:mb-px"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Coluna
              </label>
              <Select
                value={colDim}
                onValueChange={(v) => setState({ row: rowDim, col: v as DimensionKey })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSION_KEYS.map((k) => (
                    <SelectItem key={k} value={k} disabled={k === rowDim}>
                      {DIMENSIONS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="self-end"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {rowDef.label} × {colDef.label}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Toque em uma célula para ver os relatos que cruzam {rowDef.label.toLowerCase()} com{" "}
            {colDef.label.toLowerCase()}. Cor mais escura indica maior concentração.
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <DemographicHeatmap
              matrix={adapted}
              isLoading={isLoading}
              onCellClick={handleCellClick}
              rowHeaderLabel={rowDef.label}
            />
          )}
        </CardContent>
      </Card>

      <DrillInsightPanel state={drillInsight.state} onClose={drillInsight.close} />
    </div>
  );
}
