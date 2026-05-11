import { TrendingDown, TrendingUp, Minus, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  VolumeCompareDelta,
  VolumeCompareCategoryRow,
} from "@/hooks/useReportsVolumeCompare";

/**
 * HU-5.1 — Visualização da comparação A vs B em VolumeOverviewTab.
 *
 * Exibe 4 KPI cards (Total / Urbano / Transporte / Avaliação), cada um com
 * valor de A, valor de B e delta % colorido. Em seguida, um gráfico de
 * barras agrupadas mostra as top categorias com volume nos dois períodos.
 */

interface KpiRowProps {
  label: string;
  valueA: number;
  valueB: number;
  delta: { absolute: number; percent: number };
}

function deltaIcon(percent: number) {
  if (percent > 0) return <TrendingUp className="h-3.5 w-3.5" />;
  if (percent < 0) return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function deltaColorClass(percent: number): string {
  if (percent > 0) return "text-amber-600";
  if (percent < 0) return "text-emerald-600";
  return "text-muted-foreground";
}

function formatPercent(p: number): string {
  if (p === 0) return "0%";
  return `${p > 0 ? "+" : ""}${p}%`;
}

function KpiCompareCard({ label, valueA, valueB, delta }: KpiRowProps) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-3">
        <div className="text-2xl font-bold tabular-nums">{valueA.toLocaleString("pt-BR")}</div>
        <span className="text-xs text-muted-foreground">A</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-3">
        <div className="text-2xl font-bold tabular-nums text-primary">
          {valueB.toLocaleString("pt-BR")}
        </div>
        <span className="text-xs text-muted-foreground">B</span>
      </div>
      <div className={cn("mt-2 flex items-center gap-1 text-sm font-medium", deltaColorClass(delta.percent))}>
        {deltaIcon(delta.percent)}
        <span>{formatPercent(delta.percent)}</span>
        <span className="text-xs text-muted-foreground">
          ({delta.absolute > 0 ? "+" : ""}{delta.absolute.toLocaleString("pt-BR")})
        </span>
      </div>
    </Card>
  );
}

export interface VolumeCompareViewProps {
  totalsA: { total: number; urbano: number; transporte: number; avaliacao: number };
  totalsB: { total: number; urbano: number; transporte: number; avaliacao: number };
  delta: VolumeCompareDelta;
  byCategoryCompare: VolumeCompareCategoryRow[];
  isLoading: boolean;
}

export function VolumeCompareView({
  totalsA,
  totalsB,
  delta,
  byCategoryCompare,
  isLoading,
}: VolumeCompareViewProps) {
  return (
    <div className="space-y-4">
      {isLoading && totalsA.total === 0 && totalsB.total === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCompareCard
            label="Total"
            valueA={totalsA.total}
            valueB={totalsB.total}
            delta={delta.total}
          />
          <KpiCompareCard
            label="Urbano"
            valueA={totalsA.urbano}
            valueB={totalsB.urbano}
            delta={delta.urbano}
          />
          <KpiCompareCard
            label="Transporte"
            valueA={totalsA.transporte}
            valueB={totalsB.transporte}
            delta={delta.transporte}
          />
          <KpiCompareCard
            label="Avaliação"
            valueA={totalsA.avaliacao}
            valueB={totalsB.avaliacao}
            delta={delta.avaliacao}
          />
        </div>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Top categorias — A vs B</h3>
        </div>
        {isLoading && byCategoryCompare.length === 0 ? (
          <Skeleton className="h-64 w-full" />
        ) : byCategoryCompare.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem dados de categorias nos períodos selecionados.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, byCategoryCompare.length * 36)}>
            <BarChart data={byCategoryCompare} layout="vertical" margin={{ top: 10, right: 30, bottom: 0, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11 }}
                width={150}
                interval={0}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "deltaPercent") return [formatPercent(value), "Variação"];
                  return [value.toLocaleString("pt-BR"), name === "countA" ? "Período A" : "Período B"];
                }}
              />
              <Legend
                payload={[
                  { value: "Período A", type: "square", color: "hsl(220, 30%, 60%)" },
                  { value: "Período B", type: "square", color: "hsl(220, 80%, 50%)" },
                ]}
              />
              <Bar dataKey="countA" name="Período A" fill="hsl(220, 30%, 60%)" radius={[0, 2, 2, 0]} />
              <Bar dataKey="countB" name="Período B" fill="hsl(220, 80%, 50%)" radius={[0, 2, 2, 0]}>
                {byCategoryCompare.map((row, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      row.deltaPercent > 25
                        ? "hsl(20, 80%, 50%)"
                        : row.deltaPercent < -25
                        ? "hsl(140, 60%, 45%)"
                        : "hsl(220, 80%, 50%)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

export const __test__ = { formatPercent, deltaColorClass };
