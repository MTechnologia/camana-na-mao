import { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminReportsHeatmap } from "@/components/admin/AdminReportsHeatmap";
import {
  useReportsHeatmap,
  type ReportsHeatmapPeriod,
  type ReportsHeatmapTypeFilter,
} from "@/hooks/useReportsHeatmap";
import { SAO_PAULO_HEATMAP_BOUNDS } from "@/lib/reportsHeatmapData";
import { Flame, RefreshCw, AlertTriangle, Info } from "lucide-react";

export default function ReportsHeatmapPage() {
  const [typeFilter, setTypeFilter] = useState<ReportsHeatmapTypeFilter>("all");
  const [period, setPeriod] = useState<ReportsHeatmapPeriod>("30d");

  const { data, isLoading, error, refresh } = useReportsHeatmap({
    typeFilter,
    period,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Mapa de calor geográfico</h1>
              <p className="text-sm text-muted-foreground">
                Densidade de relatos urbanos georreferenciados e de avaliações (por local do equipamento), apenas
                dentro de São Paulo.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            O mapa agrega apenas pontos válidos de <strong>relatos urbanos</strong> e{" "}
            <strong>avaliações de serviços</strong> dentro do retângulo aproximado do município
            (lat {SAO_PAULO_HEATMAP_BOUNDS.minLat} a {SAO_PAULO_HEATMAP_BOUNDS.maxLat}, lng{" "}
            {SAO_PAULO_HEATMAP_BOUNDS.minLng} a {SAO_PAULO_HEATMAP_BOUNDS.maxLng}).
          </span>
        </div>

        <Card className="p-4 md:p-6">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="heatmap-type">Tipo</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ReportsHeatmapTypeFilter)}>
                <SelectTrigger id="heatmap-type">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (urbano + avaliações)</SelectItem>
                  <SelectItem value="urban">Relatos urbanos</SelectItem>
                  <SelectItem value="evaluation">Avaliações de serviços</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heatmap-period">Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as ReportsHeatmapPeriod)}>
                <SelectTrigger id="heatmap-period">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isLoading && !data ? (
            <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
          ) : (
            <AdminReportsHeatmap points={data?.points ?? []} />
          )}

          {data && (
            <p className="mt-3 text-xs text-muted-foreground">
              {data.points.length} células no mapa
              {data.truncated ? " (resultado truncado para performance)" : ""}.
              {data.start_at ? ` Dados desde ${new Date(data.start_at).toLocaleString("pt-BR")}.` : ""}
            </p>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
