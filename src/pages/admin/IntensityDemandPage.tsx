import { useState } from "react";
import { Activity, Clock, AlertTriangle, RefreshCw, Info, MapPinned } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { IntensityDemandMap } from "@/components/admin/IntensityDemandMap";
import {
  useIntensityDemand,
  type IntensityPeriod,
  type IntensityScope,
  type ZoneIntensity,
} from "@/hooks/useIntensityDemand";

/**
 * HU-4.3 — Mapa de intensidade de demanda × tempo médio de espera por zona.
 *
 * Permite identificar zonas onde priorizar ação combinando volume de relatos
 * (urban + transport) com tempo composto de resolução.
 */

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}

export default function IntensityDemandPage() {
  const [period, setPeriod] = useState<IntensityPeriod>("90d");
  const [scope, setScope] = useState<IntensityScope>("all");
  const [selected, setSelected] = useState<ZoneIntensity | null>(null);

  const { zones, summary, isLoading, error, refresh } = useIntensityDemand({ period, scope });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Intensidade de demanda × tempo de espera
              </h1>
              <p className="text-sm text-muted-foreground">
                Identifique zonas onde priorizar ação. Combina volume de relatos
                com tempo médio composto de atendimento.
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
            <strong>Tamanho da bolha</strong>: log do volume de relatos.{" "}
            <strong>Cor</strong>: tempo médio composto (verde &lt; 24h → amarelo → vermelho ≥ 1 semana).{" "}
            <strong>Tempo composto</strong>: média ponderada de tempo até resolução (50%),
            tempo até primeira resposta (30%) e tempo decorrido em pendentes (20%).
          </span>
        </div>

        {/* KPIs */}
        {!isLoading && zones.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Zonas com dados" value={zones.length} />
            <KpiCard label="Total de relatos" value={summary.totalReports} />
            <KpiCard
              label="Tempo médio geral"
              value={formatHours(summary.avgWaitHours)}
              accentClass={summary.avgWaitHours >= 168 ? "text-destructive" : "text-amber-600"}
            />
            <KpiCard
              label="Zona mais crítica"
              value={summary.worstZone?.zone ?? "—"}
              accentClass="text-destructive"
            />
          </div>
        )}

        <Card className="p-4 md:p-6">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intensity-period">Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as IntensityPeriod)}>
                <SelectTrigger id="intensity-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intensity-scope">Tipo de relato</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as IntensityScope)}>
                <SelectTrigger id="intensity-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Urbanos + Transporte</SelectItem>
                  <SelectItem value="urban">Apenas urbanos</SelectItem>
                  <SelectItem value="transport">Apenas transporte</SelectItem>
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

          {isLoading && zones.length === 0 ? (
            <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
          ) : (
            <IntensityDemandMap zones={zones} onSelect={setSelected} />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">Legenda (tempo médio):</span>
            <Badge style={{ backgroundColor: "hsl(120,75%,45%)", color: "white" }}>&lt; 24h</Badge>
            <Badge style={{ backgroundColor: "hsl(60,75%,45%)", color: "black" }}>~3 dias</Badge>
            <Badge style={{ backgroundColor: "hsl(0,75%,45%)", color: "white" }}>≥ 1 semana</Badge>
          </div>
        </Card>

        {/* Top zonas críticas */}
        {zones.length > 0 && (
          <Card className="p-4 md:p-6">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Ranking de zonas por prioridade
            </h2>
            <ul className="divide-y">
              {zones.map((z) => (
                <li
                  key={z.zone}
                  className="py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded"
                  onClick={() => setSelected(z)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(z);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <MapPinned className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{z.zone}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {z.count} relatos · {z.resolved} resolvidos · {z.pending} pendentes
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-right shrink-0">
                    <div className="font-bold tabular-nums">{z.priorityScore}/100</div>
                    <div className="text-muted-foreground">
                      ⏱ {formatHours(z.avgWaitHours)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Detalhe da zona selecionada (inline, sem sheet) */}
        {selected && (
          <Card className="p-4 md:p-6 border-primary/40">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <MapPinned className="h-4 w-4" />
                  {selected.zone}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Detalhes da zona selecionada
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <KpiCard label="Volume" value={selected.count} />
              <KpiCard label="Tempo médio" value={formatHours(selected.avgWaitHours)} />
              <KpiCard label="Score" value={`${selected.priorityScore}/100`} />
              <KpiCard
                label="% resolvido"
                value={`${selected.count > 0 ? Math.round((selected.resolved / selected.count) * 100) : 0}%`}
                accentClass="text-emerald-600"
              />
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function KpiCard({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string | number;
  accentClass?: string;
}) {
  return (
    <Card className="p-4">
      <div className={`text-2xl font-bold tabular-nums ${accentClass ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}
