import { useState } from "react";
import { Star, RefreshCw, AlertTriangle, Info, BarChart3 } from "lucide-react";
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
import { RatingsBubbleMap } from "@/components/admin/RatingsBubbleMap";
import { ServiceRatingsDetailSheet } from "@/components/admin/ServiceRatingsDetailSheet";
import {
  useRatingsConcentration,
  type RatingsPeriod,
  type ServiceRatingsAggregate,
} from "@/hooks/useRatingsConcentration";

/**
 * HU-4.2 — Mapa de concentração e polarização territorial de avaliações.
 *
 * Combina heatmap (densidade de avaliações) com bolhas (cor por média de
 * estrelas, tamanho por volume). Click em bolha abre painel lateral com
 * lista de avaliações e dimensões críticas.
 */

export default function RatingsConcentrationPage() {
  const [period, setPeriod] = useState<RatingsPeriod>("90d");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ServiceRatingsAggregate | null>(null);

  const { aggregates, availableServiceTypes, summary, isLoading, error, refresh } =
    useRatingsConcentration({
      period,
      serviceTypeFilter: serviceTypeFilter === "all" ? null : serviceTypeFilter,
    });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Concentração e polarização de avaliações
              </h1>
              <p className="text-sm text-muted-foreground">
                Identifique zonas onde as avaliações são polarizadas, com bolhas
                coloridas pela média de estrelas e tamanho proporcional ao volume.
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
            <strong>Cor da bolha</strong>: gradiente vermelho (média 1★) → amarelo (3★) → verde (5★).{" "}
            <strong>Tamanho</strong>: log do volume de avaliações.{" "}
            <strong>Polarização</strong>: % de avaliações 1-2★ ou 4-5★ (extremos), indica regiões divididas.
            Toque numa bolha pra ver os comentários e dimensões críticas.
          </span>
        </div>

        {/* KPIs do recorte */}
        {!isLoading && summary.serviceCount > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Equipamentos" value={summary.serviceCount} />
            <KpiCard label="Avaliações" value={summary.totalRatings} />
            <KpiCard
              label="Média geral ★"
              value={summary.avgStars.toFixed(2)}
              accentClass="text-amber-600"
            />
            <KpiCard
              label="Polarização média"
              value={`${summary.avgPolarization.toFixed(0)}%`}
              accentClass={summary.avgPolarization >= 50 ? "text-destructive" : undefined}
            />
          </div>
        )}

        <Card className="p-4 md:p-6">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ratings-period">Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as RatingsPeriod)}>
                <SelectTrigger id="ratings-period">
                  <SelectValue placeholder="Período" />
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
              <Label htmlFor="ratings-type">Tipo de serviço</Label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger id="ratings-type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {availableServiceTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
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

          {isLoading && aggregates.length === 0 ? (
            <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
          ) : (
            <RatingsBubbleMap aggregates={aggregates} onSelect={setSelected} />
          )}

          {/* Legenda */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">Legenda:</span>
            <Badge style={{ backgroundColor: "hsl(0,75%,45%)", color: "white" }}>1★ – Ruim</Badge>
            <Badge style={{ backgroundColor: "hsl(60,75%,45%)", color: "black" }}>3★ – Médio</Badge>
            <Badge style={{ backgroundColor: "hsl(120,75%,45%)", color: "white" }}>5★ – Excelente</Badge>
          </div>
        </Card>

        {/* Top 10 mais polarizados (lista textual) */}
        {aggregates.length > 0 && (
          <Card className="p-4 md:p-6">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" />
              Top 10 equipamentos mais polarizados (≥ 5 avaliações)
            </h2>
            <ul className="divide-y">
              {aggregates
                .filter((a) => a.count >= 5)
                .sort((a, b) => b.polarizationIndex - a.polarizationIndex)
                .slice(0, 10)
                .map((a) => (
                  <li
                    key={a.serviceId}
                    className="py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded"
                    onClick={() => setSelected(a)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.serviceName ?? "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.serviceType ?? "—"} · {a.district ?? "—"}
                      </p>
                    </div>
                    <div className="text-xs text-right shrink-0">
                      <div className="font-bold tabular-nums">{a.polarizationIndex}%</div>
                      <div className="text-muted-foreground">
                        {a.count} aval. · ★ {a.avgStars.toFixed(1)}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        )}

        <ServiceRatingsDetailSheet selected={selected} onClose={() => setSelected(null)} />
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
