import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Siren,
  Sparkles,
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { KPICard } from "@/components/analytics/KPICard";
import { AnomaliesTable } from "@/components/admin/anomalies/AnomaliesTable";
import { AnomalyDetailSheet } from "@/components/admin/anomalies/AnomalyDetailSheet";
import {
  useReportAnomalies,
  type AnomalyEntry,
} from "@/hooks/useReportAnomalies";

/**
 * HU-9.3 — Página /admin/anomalias.
 *
 * Mostra anomalias de volume detectadas pela edge function detect-anomalies.
 * Permite reconhecer, dispensar, anotar e re-rodar a detecção manualmente.
 */

function startOfDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nDaysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AnomaliesPage() {
  const {
    anomalies,
    isLoading,
    error,
    lastUpdate,
    refresh,
    acknowledge,
    dismiss,
    setNotes,
    runDetection,
    isRunningDetection,
  } = useReportAnomalies();

  const [selected, setSelected] = useState<AnomalyEntry | null>(null);

  const stats = useMemo(() => {
    const today = startOfDayKey();
    const sevenDaysAgo = nDaysAgoKey(7);
    const active = anomalies.filter((a) => a.status === "active");
    return {
      activeTotal: active.length,
      criticalToday: active.filter(
        (a) => a.severity === "critical" && a.signalDate >= today,
      ).length,
      lastWeek: anomalies.filter((a) => a.signalDate >= sevenDaysAgo).length,
      acknowledged: anomalies.filter((a) => a.status === "acknowledged").length,
    };
  }, [anomalies]);

  const handleRunDetection = async () => {
    try {
      const result = await runDetection();
      if (result) {
        if (result.found === 0) {
          toast.success("Análise concluída. Nenhuma anomalia detectada.");
        } else {
          toast.success(
            `${result.found} anomalia${result.found === 1 ? "" : "s"} detectada${result.found === 1 ? "" : "s"}.`,
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível executar: ${message}`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Siren className="h-6 w-6 text-destructive" />
              Detecção de anomalias
            </h1>
            <p className="text-muted-foreground">
              O sistema monitora o volume diário de relatos e dispara alerta
              quando o valor real escapa do intervalo esperado. Use para
              reagir rapidamente a picos ou quedas atípicas.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <AnalyticsLiveBadge
              lastUpdates={[lastUpdate]}
              onRefresh={() => void refresh()}
              refreshing={isLoading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRunDetection()}
              disabled={isRunningDetection}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRunningDetection ? "animate-spin" : ""}`}
              />
              Detectar agora
            </Button>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Ativas"
            subtitle="Aguardando ação"
            value={stats.activeTotal}
            icon={AlertTriangle}
            className={
              stats.activeTotal > 0 ? "border-destructive/40" : undefined
            }
          />
          <KPICard
            title="Críticas (hoje)"
            value={stats.criticalToday}
            icon={Siren}
            className={
              stats.criticalToday > 0 ? "border-destructive/40" : undefined
            }
          />
          <KPICard
            title="Últimos 7 dias"
            subtitle="Total detectado"
            value={stats.lastWeek}
            icon={Sparkles}
          />
          <KPICard
            title="Reconhecidas"
            subtitle="Em tratativa"
            value={stats.acknowledged}
            icon={CheckCircle2}
            className="border-green-500/30"
          />
        </div>

        {/* Tabela */}
        <AnomaliesTable
          anomalies={anomalies}
          onSelectAnomaly={setSelected}
        />

        {/* Rodapé com info do modelo */}
        <Card className="p-3 text-[11px] text-muted-foreground">
          <span className="font-medium">Como funciona:</span> a detecção roda
          1x/dia comparando o volume real ao previsto pelo modelo (HU-9.2).
          Dispara alerta quando |z-score| ≥ 2,5 — ou seja, quando o desvio
          em relação ao esperado é estatisticamente significativo.
        </Card>

        <AnomalyDetailSheet
          anomaly={selected}
          onOpenChange={(v) => !v && setSelected(null)}
          actions={{ acknowledge, dismiss, setNotes }}
        />
      </div>
    </AdminLayout>
  );
}
