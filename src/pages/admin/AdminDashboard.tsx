import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  Gauge,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterDatePicker } from "@/components/filters/FilterDatePicker";
import type { DateRangeValue } from "@/components/filters/types";
import { ConsolidatedKPICard } from "@/components/admin/ConsolidatedKPICard";
import { AdminLiveIndicator } from "@/components/admin/AdminLiveIndicator";
import { LiveActivityFeed } from "@/components/admin/LiveActivityFeed";
import { useReportsVolume } from "@/hooks/useReportsVolume";
import { useResponseTimeAnalytics } from "@/hooks/useResponseTimeAnalytics";
import { useDiagnosticoCriticidade } from "@/hooks/useDiagnosticoCriticidade";
import { useAudienciasAnalytics } from "@/hooks/useAudienciasAnalytics";
import { useLiveActivityFeed } from "@/hooks/useLiveActivityFeed";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/**
 * HU-1.5 — Dashboard único com visualizações interativas em tempo real.
 *
 * Reformula a página /admin para servir como visão executiva consolidada:
 *   - Filtro de período global (afeta todos os KPIs).
 *   - Indicador "ao vivo" piscando, com timestamp da última mudança detectada.
 *   - 4 KPIs clicáveis (Volume, Eficiência, Criticidade, Audiências) que
 *     navegam para a aba detalhada correspondente em /admin/analytics.
 *   - Feed lateral de atividade recente (relatos + audiências) em tempo real.
 *
 * Realtime via Supabase channels: assina mudanças nas tabelas relevantes e
 * dispara refresh dos hooks de dados quando algo é inserido/atualizado.
 */

const REALTIME_TABLES = [
  "urban_reports",
  "transport_reports",
  "service_ratings",
  "audiencia_inscricoes",
  "audiencia_participacoes",
  "report_patterns",
] as const;

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<DateRangeValue | undefined>(undefined);

  const filters = useMemo(
    () => ({ startDate: period?.from, endDate: period?.to }),
    [period],
  );

  const { stats: volumeStats, isLoading: volumeLoading, refresh: refreshVolume } =
    useReportsVolume(filters);
  const {
    stats: responseStats,
    isLoading: responseLoading,
    refresh: refreshResponse,
  } = useResponseTimeAnalytics(filters);
  const {
    stats: diagStats,
    isLoading: diagLoading,
    refresh: refreshDiag,
  } = useDiagnosticoCriticidade(filters);
  const {
    stats: audStats,
    isLoading: audLoading,
    refresh: refreshAud,
  } = useAudienciasAnalytics(filters);

  const { items: feedItems, isLoading: feedLoading } = useLiveActivityFeed(15);

  const refreshAll = () => {
    void refreshVolume();
    void refreshResponse();
    void refreshDiag();
    void refreshAud();
  };

  const { lastUpdate, refresh: bumpLastUpdate } = useRealtimeRefresh(
    REALTIME_TABLES,
    refreshAll,
  );

  const isLoadingAny = volumeLoading || responseLoading || diagLoading || audLoading;

  const responseDirectionIcon =
    responseStats.direction === "melhorou"
      ? ArrowDownRight
      : responseStats.direction === "piorou"
        ? ArrowUpRight
        : null;

  const responseCaption =
    responseStats.avgHoursPrevious > 0
      ? `${responseStats.direction === "melhorou" ? "↓" : responseStats.direction === "piorou" ? "↑" : "→"} ${Math.abs(responseStats.deltaPct).toFixed(0)}% vs período anterior`
      : "Sem comparação prévia";
  const responseCaptionVariant =
    responseStats.direction === "melhorou"
      ? "success"
      : responseStats.direction === "piorou"
        ? "destructive"
        : "default";

  const criticidadeCaption =
    diagStats.globalScore >= 70
      ? "Score alto — atenção"
      : diagStats.globalScore >= 40
        ? "Score moderado"
        : "Score baixo";
  const criticidadeVariant =
    diagStats.globalScore >= 70
      ? "destructive"
      : diagStats.globalScore >= 40
        ? "warning"
        : "success";

  const audCaption =
    audStats.zeroInscritosProximas.length > 0
      ? `${audStats.zeroInscritosProximas.length} sem inscritos a < 7d`
      : audStats.totalAudiencias === 0
        ? "Sem audiências no período"
        : "Engajamento OK";
  const audVariant =
    audStats.zeroInscritosProximas.length > 0 ? "warning" : "success";

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">Dashboard executivo</h1>
              <AdminLiveIndicator lastUpdate={lastUpdate} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Visão consolidada da operação em tempo real — clique nos cards para detalhar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FilterDatePicker
              value={period}
              onChange={setPeriod}
              placeholder="Todos os períodos"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refreshAll();
                bumpLastUpdate();
              }}
              disabled={isLoadingAny}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAny ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* KPIs consolidados clicáveis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <ConsolidatedKPICard
            title="Volume de relatos"
            subtitle="Urbanos + Transporte + Avaliações"
            value={volumeStats.total}
            caption={
              volumeStats.total > 0
                ? `${volumeStats.urbano} U • ${volumeStats.transporte} T • ${volumeStats.avaliacao} A`
                : "Sem relatos no período"
            }
            captionVariant="default"
            icon={BarChart3}
            isLoading={volumeLoading && volumeStats.total === 0}
            onClick={() => navigate("/admin/analytics/general")}
          />

          <ConsolidatedKPICard
            title="Tempo médio de resolução"
            subtitle="SLA de atendimento"
            value={formatHours(responseStats.avgHours)}
            caption={responseCaption}
            captionVariant={responseCaptionVariant}
            icon={responseDirectionIcon ?? Clock}
            isLoading={responseLoading && responseStats.count === 0}
            onClick={() => navigate("/admin/analytics/general")}
          />

          <ConsolidatedKPICard
            title="Score de criticidade"
            subtitle={`${diagStats.totalPatterns} padrões ativos`}
            value={diagStats.globalScore}
            caption={criticidadeCaption}
            captionVariant={criticidadeVariant}
            icon={Gauge}
            isLoading={diagLoading && diagStats.totalRecords === 0}
            onClick={() => navigate("/admin/analytics/general")}
          />

          <ConsolidatedKPICard
            title="Engajamento em audiências"
            subtitle={`${audStats.totalAudiencias} audiências no período`}
            value={audStats.totalInscricoes}
            caption={audCaption}
            captionVariant={audVariant}
            icon={Megaphone}
            isLoading={audLoading && audStats.totalAudiencias === 0}
            onClick={() => navigate("/admin/analytics/general")}
          />
        </div>

        {/* Mini visualizações + Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-xs font-semibold text-foreground">Hotspot crítico #1</h3>
              </div>
              {diagStats.topCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum hotspot detectado.
                </p>
              ) : (
                <>
                  <p className="text-base font-medium truncate">
                    {diagStats.topCategories[0].category}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Score {diagStats.topCategories[0].score} •{" "}
                    {diagStats.topCategories[0].total} relatos
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 h-auto text-xs mt-2"
                    onClick={() => navigate("/admin/analytics/general")}
                  >
                    Ver diagnóstico →
                  </Button>
                </>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-semibold text-foreground">Audiências sem inscritos</h3>
              </div>
              {audStats.zeroInscritosProximas.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  ✓ Todas próximas têm inscritos.
                </p>
              ) : (
                <>
                  <p className="text-base font-medium truncate">
                    {audStats.zeroInscritosProximas[0].titulo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {audStats.zeroInscritosProximas.length} audiência
                    {audStats.zeroInscritosProximas.length === 1 ? "" : "s"} a {`< 7d`}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 h-auto text-xs mt-2"
                    onClick={() => navigate("/admin/analytics/general")}
                  >
                    Ver audiências →
                  </Button>
                </>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h3 className="text-xs font-semibold text-foreground">Resolvidos no período</h3>
              </div>
              <p className="text-2xl font-semibold tabular-nums">{responseStats.count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {responseStats.medianHours > 0
                  ? `Mediana: ${formatHours(responseStats.medianHours)}`
                  : "Sem dados"}
              </p>
            </Card>

            <Card className="p-4 md:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-foreground">Volume por tipo</h3>
                <span className="text-[10px] text-muted-foreground">no período selecionado</span>
              </div>
              {volumeStats.total === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Sem dados no período.
                </p>
              ) : (
                <div className="space-y-2">
                  <VolumeBar label="Urbanos" count={volumeStats.urbano} max={volumeStats.total} />
                  <VolumeBar label="Transporte" count={volumeStats.transporte} max={volumeStats.total} />
                  <VolumeBar label="Avaliações" count={volumeStats.avaliacao} max={volumeStats.total} />
                </div>
              )}
            </Card>
          </div>

          <LiveActivityFeed
            items={feedItems}
            isLoading={feedLoading}
            className="lg:row-span-1"
          />
        </div>
      </div>
    </AdminLayout>
  );
}

function VolumeBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {count} <span className="text-[10px]">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
