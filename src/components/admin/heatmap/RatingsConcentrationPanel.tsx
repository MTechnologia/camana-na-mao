import { useState } from "react";
import { useGlobalHeatmapExtendedPeriod } from "@/hooks/useGlobalHeatmapExtendedPeriod";
import { RefreshCw, AlertTriangle, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
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
import { HeatmapFilterLabel } from "@/components/admin/heatmap/HeatmapFilterLabel";
import { HeatmapPanelIntro } from "@/components/admin/heatmap/HeatmapPanelIntro";
import { HeatmapVisualScale } from "@/components/admin/heatmap/HeatmapVisualScale";
import {
  useRatingsConcentration,
  type ServiceRatingsAggregate,
} from "@/hooks/useRatingsConcentration";
import {
  RATINGS_HEATMAP_SERVICE_TYPE_LEGEND,
  ratingsConcentrationPanelLegends,
} from "@/lib/analyticsParameterLegends";
import { getServiceTypeLabel } from "@/components/icons/serviceTypeIcons";

export function RatingsConcentrationPanel() {
  const period = useGlobalHeatmapExtendedPeriod();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ServiceRatingsAggregate | null>(null);

  const { aggregates, availableServiceTypes, summary, isLoading, error, refresh } =
    useRatingsConcentration({
      period,
      serviceTypeFilter: serviceTypeFilter === "all" ? null : serviceTypeFilter,
    });

  const TRY_THRESHOLDS = [5, 3, 2, 1];
  let topThreshold = 5;
  let topItems: ServiceRatingsAggregate[] = [];
  for (const t of TRY_THRESHOLDS) {
    const filtered = aggregates.filter((a) => a.count >= t);
    if (filtered.length > 0) {
      topThreshold = t;
      topItems = [...filtered]
        .sort((a, b) => b.polarizationIndex - a.polarizationIndex)
        .slice(0, 10);
      break;
    }
  }

  return (
    <div className="space-y-4">
      <HeatmapPanelIntro
        intro={
          <>
            Avaliações de equipamentos publicadas em São Paulo.{" "}
            <Link
              to="/admin/equipment-ratings"
              className="text-primary underline-offset-2 hover:underline"
            >
              Gestão operacional
            </Link>
            . Use os parâmetros (<span className="font-medium text-foreground">?</span>) ou a
            legenda para entender bolhas, cores e polarização.
          </>
        }
        legends={ratingsConcentrationPanelLegends()}
        tooltipTitle="Parâmetros — concentração de avaliações"
        ariaLabel="Ver todos os parâmetros do mapa de avaliações"
      />

      {!isLoading && summary.serviceCount > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 gap-4 md:max-w-md">
            <div className="space-y-2">
              <HeatmapFilterLabel
                htmlFor="ratings-type"
                legend={RATINGS_HEATMAP_SERVICE_TYPE_LEGEND}
              />
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger id="ratings-type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {availableServiceTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {getServiceTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <HeatmapVisualScale variant="stars" className="mb-3" />

        {isLoading && aggregates.length === 0 ? (
          <Skeleton className="h-[min(70vh,560px)] min-h-[400px] w-full rounded-lg" />
        ) : (
          <RatingsBubbleMap aggregates={aggregates} onSelect={setSelected} />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">Referência rápida:</span>
          <Badge style={{ backgroundColor: "hsl(0,75%,45%)", color: "white" }}>1★ – Ruim</Badge>
          <Badge style={{ backgroundColor: "hsl(60,75%,45%)", color: "black" }}>3★ – Médio</Badge>
          <Badge style={{ backgroundColor: "hsl(120,75%,45%)", color: "white" }}>
            5★ – Excelente
          </Badge>
        </div>
      </Card>

      {aggregates.length > 0 && topItems.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-4 w-4" />
            Top {topItems.length} equipamentos mais polarizados
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Equipamentos com ≥ {topThreshold} avaliação{topThreshold === 1 ? "" : "ões"} no recorte.
          </p>
          <ul className="divide-y">
            {topItems.map((a) => (
              <li
                key={a.serviceId}
                className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-2 hover:bg-muted/40"
                onClick={() => setSelected(a)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(a);
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.serviceName ?? "Sem nome"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.serviceType ? getServiceTypeLabel(a.serviceType) : "—"} · {a.district ?? "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
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
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
