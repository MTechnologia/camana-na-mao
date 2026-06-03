import { useState } from "react";
import { AlertTriangle, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import {
  ForecastChart,
  ForecastSummaryCards,
  ForecastTable,
} from "@/components/admin/forecast/ForecastVisualizations";
import { useVolumeForecast, type ForecastHorizon } from "@/hooks/useVolumeForecast";

/**
 * HU-9.2 — Página /admin/previsoes.
 *
 * Mostra previsão de volume diário (urban + transport) com horizonte
 * configurável (7/14/30 dias). Mostra:
 *  - KPIs (próx 7/14/30 com delta vs baseline)
 *  - Linha histórica + previsão + intervalo de confiança 95%
 *  - Tabela diária detalhada
 *
 * Modelagem: client-side, sem dependências externas (média móvel +
 * sazonalidade semanal). Realtime ativo: refaz forecast quando novos
 * relatos chegam.
 */

const HORIZON_OPTIONS: { value: ForecastHorizon; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 30, label: "30 dias" },
];

export default function ForecastPage() {
  const [horizon, setHorizon] = useState<ForecastHorizon>(30);
  const {
    history,
    forecast,
    summary,
    diagnostics,
    isLoading,
    isInitialLoading,
    error,
    lastUpdate,
    refresh,
  } = useVolumeForecast({ horizonDays: horizon });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Previsões de volume
            </h1>
            <p className="text-muted-foreground">
              Estimativa de relatos para os próximos dias baseada no histórico recente. Use os
              intervalos de confiança para planejar capacidade e equipes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnalyticsLiveBadge
              lastUpdates={[lastUpdate]}
              onRefresh={() => void refresh()}
              refreshing={isLoading}
            />
          </div>
        </div>

        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </Card>
        )}

        {/* Toggle de horizonte */}
        <Card className="p-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Horizonte:</span>
          {HORIZON_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={horizon === opt.value ? "default" : "outline"}
              onClick={() => setHorizon(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          <div className="ml-auto text-[11px] text-muted-foreground hidden md:block">
            <span className="inline-flex items-center gap-1">
              <LineChartIcon className="h-3 w-3" />
              Modelo: tendência linear × sazonalidade semanal · IC 95% baseado em desvio dos
              resíduos
            </span>
          </div>
        </Card>

        {/* Loading state */}
        {isInitialLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <ForecastSummaryCards
              next7={summary.next7}
              next14={summary.next14}
              next30={summary.next30}
            />
            <ForecastChart history={history} forecast={forecast} historyTail={30} />
            <ForecastTable forecast={forecast} />

            {/* Diagnóstico (rodapé pequeno) */}
            <Card className="p-3 text-[11px] text-muted-foreground">
              <span className="font-medium">Diagnóstico do modelo:</span> tendência{" "}
              {diagnostics.trendSlope >= 0 ? "+" : ""}
              {diagnostics.trendSlope.toFixed(2)} relato/dia · desvio dos resíduos{" "}
              {diagnostics.residualStdDev.toFixed(1)} · {history.length} dias de histórico
              considerados.
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
