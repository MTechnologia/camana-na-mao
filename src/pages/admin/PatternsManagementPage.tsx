import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { KPICard } from "@/components/analytics/KPICard";
import { PatternsTable } from "@/components/admin/patterns/PatternsTable";
import { PatternDetailSheet } from "@/components/admin/patterns/PatternDetailSheet";
import {
  PatternsTimeline,
  PeakHoursHeatmap,
} from "@/components/admin/patterns/PatternsVisualizations";
import {
  usePatternsList,
  type PatternEntry,
} from "@/hooks/usePatternsList";

/**
 * HU-9.1 — Página dedicada para visualizar padrões identificados pela IA.
 *
 * Orquestra:
 *  - KPIs (totais por status)
 *  - Botão "Reanalisar" (invoca edge function analyze-patterns)
 *  - Tabs Lista (tabela ranqueada + busca) e Visualizações (timeline + heatmap)
 *  - Drill-down via PatternDetailSheet → ReportDetailSheet (relatos individuais)
 */

export default function PatternsManagementPage() {
  const { patterns, isLoading, error, lastUpdate, availableTypes, availableStatuses, refresh } =
    usePatternsList();
  const [selected, setSelected] = useState<PatternEntry | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  const stats = useMemo(() => {
    const total = patterns.length;
    const active = patterns.filter((p) => p.status === "active").length;
    const resolved = patterns.filter((p) => p.status === "resolved").length;
    const critical = patterns.filter((p) => {
      const s = (p.averageSeverity ?? "").toLowerCase();
      return s.includes("crític") || s.includes("critic");
    }).length;
    return { total, active, resolved, critical };
  }, [patterns]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      // HU-9.1 — Chama a RPC do banco diretamente em vez de passar pela
      // edge function `analyze-patterns`. A edge function exige header
      // `x-cron-secret` (uso interno do cron), o que não é seguro expor
      // no cliente. A RPC `analyze_report_patterns` é SECURITY DEFINER
      // e tem GRANT EXECUTE para authenticated.
      const { error: rpcErr } = await supabase.rpc("analyze_report_patterns");
      if (rpcErr) throw rpcErr;

      // Best-effort: também sincroniza eventos de threshold (a edge function
      // legacy fazia isso em sequência). Falha aqui apenas loga.
      try {
        await supabase.rpc("sync_pattern_threshold_events" as never);
      } catch (syncErr) {
        console.warn("[PatternsManagementPage] sync_pattern_threshold_events:", syncErr);
      }

      toast.success("Análise concluída. Atualizando lista...");
      void refresh();
    } catch (err) {
      console.error("[PatternsManagementPage] reanalyze error", err);
      const message =
        err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível reanalisar: ${message}`);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Padrões identificados pela IA
            </h1>
            <p className="text-muted-foreground">
              Análise automática de relatos detecta tendências, picos e
              recorrências. Clique em um padrão para ver os relatos que o compõem.
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
              onClick={() => void handleReanalyze()}
              disabled={reanalyzing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${reanalyzing ? "animate-spin" : ""}`}
              />
              Reanalisar agora
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
          <KPICard title="Total" subtitle="Padrões detectados" value={stats.total} icon={Sparkles} />
          <KPICard title="Ativos" value={stats.active} icon={Activity} />
          <KPICard
            title="Críticos"
            value={stats.critical}
            icon={AlertTriangle}
            className="border-destructive/30"
          />
          <KPICard
            title="Resolvidos"
            value={stats.resolved}
            icon={CheckCircle2}
            className="border-green-500/30"
          />
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="viz">Visualizações</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="space-y-4 pt-4">
            <PatternsTable
              patterns={patterns}
              availableTypes={availableTypes}
              availableStatuses={availableStatuses}
              onSelectPattern={setSelected}
            />
          </TabsContent>
          <TabsContent value="viz" className="space-y-4 pt-4">
            <PatternsTimeline patterns={patterns} />
            <PeakHoursHeatmap patterns={patterns} />
          </TabsContent>
        </Tabs>

        <PatternDetailSheet
          pattern={selected}
          onOpenChange={(v) => !v && setSelected(null)}
        />
      </div>
    </AdminLayout>
  );
}
