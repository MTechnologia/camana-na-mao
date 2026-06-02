import { useMemo } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ForecastPoint, VolumePoint } from "@/lib/forecastVolume";
import type { ForecastSummary } from "@/hooks/useVolumeForecast";

/**
 * HU-9.2 — Componentes de visualização da previsão de volume.
 *
 * - ForecastSummaryCards: 3 KPIs (7/14/30 dias) com delta vs baseline.
 * - ForecastChart: linha histórica sólida + linha forecast tracejada +
 *   área de intervalo de confiança.
 * - ForecastTable: tabela das previsões diárias.
 */

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatPt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatDateLabel(yyyyMmDd: string): string {
  const [, m, d] = yyyyMmDd.split("-");
  return `${d}/${m}`;
}

// ============================================================================
// ForecastSummaryCards
// ============================================================================

interface ForecastSummaryCardsProps {
  next7: ForecastSummary;
  next14: ForecastSummary;
  next30: ForecastSummary;
}

export function ForecastSummaryCards({ next7, next14, next30 }: ForecastSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard label="Próximos 7 dias" summary={next7} subtitle="Comparado à última semana" />
      <SummaryCard
        label="Próximos 14 dias"
        summary={next14}
        subtitle="Comparado às últimas 2 semanas"
      />
      <SummaryCard label="Próximos 30 dias" summary={next30} subtitle="Comparado ao último mês" />
    </div>
  );
}

function SummaryCard({
  label,
  summary,
  subtitle,
}: {
  label: string;
  summary: ForecastSummary;
  subtitle: string;
}) {
  const delta = summary.deltaPct;
  const direction = Math.abs(delta) < 1 ? "stable" : delta > 0 ? "up" : "down";
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const colorClass =
    direction === "up"
      ? "text-red-600"
      : direction === "down"
        ? "text-green-600"
        : "text-muted-foreground";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold text-foreground mt-1">{formatPt(summary.total)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">relatos previstos</p>
        </div>
        <div className="text-right shrink-0">
          <div className={cn("inline-flex items-center gap-1 text-sm font-medium", colorClass)}>
            <Icon className="h-3.5 w-3.5" />
            {direction === "stable" ? "estável" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Base: {formatPt(summary.baseline)}
          </p>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// ForecastChart
// ============================================================================

interface ForecastChartProps {
  history: VolumePoint[];
  forecast: ForecastPoint[];
  /** Quantos dias finais do histórico mostrar (para não poluir). */
  historyTail?: number;
}

export function ForecastChart({ history, forecast, historyTail = 30 }: ForecastChartProps) {
  const data = useMemo(() => {
    const tail = history.slice(-historyTail);
    const histRows = tail.map((p) => ({
      date: p.date,
      label: formatDateLabel(p.date),
      historico: p.count,
      previsao: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }));
    // Ponto de transição: último histórico é também ponto inicial da previsão.
    if (histRows.length > 0) {
      const lastHist = histRows[histRows.length - 1];
      lastHist.previsao = lastHist.historico;
    }
    const fcRows = forecast.map((p) => ({
      date: p.date,
      label: formatDateLabel(p.date),
      historico: null as number | null,
      previsao: Math.round(p.prediction),
      lower: Math.round(p.lower),
      upper: Math.round(p.upper),
    }));
    return [...histRows, ...fcRows];
  }, [history, forecast, historyTail]);

  if (history.length === 0 && forecast.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Sem dados suficientes para gerar previsão.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">Volume diário</h3>
          <p className="text-xs text-muted-foreground">
            Linha sólida: histórico · Linha tracejada: previsão · Faixa: intervalo de confiança 95%
          </p>
        </div>
      </div>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: unknown, name: string) => {
                if (value === null || value === undefined) return ["—", name];
                const n = Number(value);
                if (name === "lower" || name === "upper")
                  return [formatPt(n), name === "lower" ? "Mín. confiança" : "Máx. confiança"];
                return [formatPt(n), name === "historico" ? "Histórico" : "Previsão"];
              }}
            />
            {/* Intervalo de confiança como área (preenche entre lower e upper).
                O truque: dois Area componentes; um do upper (claro) e outro do
                lower com background do card (mascara). Mais simples: usa apenas
                a faixa upper como área primária. */}
            <Area
              type="monotone"
              dataKey="upper"
              fill="hsl(var(--primary) / 0.12)"
              stroke="none"
              connectNulls
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              fill="hsl(var(--background))"
              stroke="none"
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="historico"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="previsao"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================================================
// ForecastTable
// ============================================================================

interface ForecastTableProps {
  forecast: ForecastPoint[];
}

export function ForecastTable({ forecast }: ForecastTableProps) {
  if (forecast.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">Sem previsões a exibir.</Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Previsão diária detalhada</h3>
        <p className="text-xs text-muted-foreground">
          Use o intervalo de confiança para planejar margem de segurança.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Dia da semana</th>
              <th className="px-4 py-2 font-medium text-right">Previsão</th>
              <th className="px-4 py-2 font-medium text-right">Mínimo</th>
              <th className="px-4 py-2 font-medium text-right">Máximo</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((p) => {
              const isWeekend = p.weekday === 0 || p.weekday === 6;
              return (
                <tr
                  key={p.date}
                  className={cn("border-t border-border/60", isWeekend && "bg-muted/20")}
                >
                  <td className="px-4 py-2 flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {formatDateLabel(p.date)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {WEEKDAY_SHORT[p.weekday]}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-1">
                      {WEEKDAY_LABELS[p.weekday]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatPt(p.prediction)}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatPt(p.lower)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatPt(p.upper)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
