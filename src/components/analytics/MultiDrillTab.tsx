import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Compass,
  Gauge,
  MapPin,
  RefreshCw,
  Tag,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/analytics/KPICard";
import { cn } from "@/lib/utils";
import {
  useMultiDrill,
  type DrillDimension,
  type MultiDrillPosition,
} from "@/hooks/useMultiDrill";

/**
 * Aba "Drill-down" do dashboard administrativo (HU-3.2).
 *
 * Drill hierárquico em 4 dimensões — Categoria, Tempo, Status/SLA e Audiências —
 * cada uma com 3 níveis de agrupamento + folha de detalhes (relatos ou inscritos).
 * Mobile-first: chips em flex-wrap, KPIs empilháveis e listas sem grid rígido.
 */

interface DimensionDef {
  key: DrillDimension;
  label: string;
  description: string;
  level1Label: string;
  level2Label: string;
  level3Label: string;
}

const DIMENSIONS: DimensionDef[] = [
  {
    key: "categoria",
    label: "Categoria",
    description: "Tipo › Categoria › Bairro",
    level1Label: "Tipo de relato",
    level2Label: "Categorias deste tipo",
    level3Label: "Bairros desta categoria",
  },
  {
    key: "tempo",
    label: "Tempo",
    description: "Ano › Mês › Dia",
    level1Label: "Ano",
    level2Label: "Meses deste ano",
    level3Label: "Dias deste mês",
  },
  {
    key: "status",
    label: "Status / SLA",
    description: "Status › Severidade › Bairro",
    level1Label: "Status",
    level2Label: "Severidade",
    level3Label: "Bairros deste recorte",
  },
  {
    key: "audiencia",
    label: "Audiências",
    description: "Audiência › Status › Bairro",
    level1Label: "Audiência",
    level2Label: "Status da inscrição",
    level3Label: "Bairros dos inscritos",
  },
];

function dimensionDef(d: DrillDimension): DimensionDef {
  return DIMENSIONS.find((x) => x.key === d) ?? DIMENSIONS[0];
}

interface BreadcrumbStep {
  label: string;
  position: MultiDrillPosition;
}

function buildBreadcrumbs(position: MultiDrillPosition): BreadcrumbStep[] {
  const def = dimensionDef(position.dimension);
  const steps: BreadcrumbStep[] = [
    { label: def.label, position: { dimension: position.dimension } },
  ];
  if (position.level1) {
    steps.push({
      label: position.level1,
      position: { dimension: position.dimension, level1: position.level1 },
    });
  }
  if (position.level2) {
    steps.push({
      label: position.level2,
      position: {
        dimension: position.dimension,
        level1: position.level1,
        level2: position.level2,
      },
    });
  }
  if (position.level3) {
    steps.push({
      label: position.level3,
      position: { ...position },
    });
  }
  return steps;
}

function levelLabel(position: MultiDrillPosition, isLeaf: boolean): string {
  if (isLeaf) return position.dimension === "audiencia" ? "Inscritos" : "Relatos";
  const def = dimensionDef(position.dimension);
  if (!position.level1) return def.level1Label;
  if (!position.level2) return def.level2Label;
  return def.level3Label;
}

function dimensionIcon(d: DrillDimension) {
  if (d === "categoria") return <Tag className="h-4 w-4" />;
  if (d === "tempo") return <Calendar className="h-4 w-4" />;
  if (d === "status") return <ClipboardList className="h-4 w-4" />;
  return <Users className="h-4 w-4" />;
}

function statusBadgeVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  const s = status.toLowerCase();
  if (s.includes("resolvido") || s === "concluído") return "default";
  if (s.includes("pendente")) return "secondary";
  if (s.includes("rejeitado")) return "destructive";
  return "outline";
}

export function MultiDrillTab() {
  const [position, setPosition] = useState<MultiDrillPosition>({
    dimension: "categoria",
  });
  const { stats, isLoading, error, refresh } = useMultiDrill(position);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(position), [position]);
  const def = useMemo(() => dimensionDef(position.dimension), [position.dimension]);

  const handleSelectDimension = (d: DrillDimension) => {
    setPosition({ dimension: d });
  };

  const handleNextClick = (value: string) => {
    if (!position.level1) {
      setPosition({ dimension: position.dimension, level1: value });
    } else if (!position.level2) {
      setPosition({ dimension: position.dimension, level1: position.level1, level2: value });
    } else if (!position.level3) {
      setPosition({ ...position, level3: value });
    }
  };

  const handleBreadcrumbClick = (step: BreadcrumbStep) => setPosition(step.position);
  const handleReset = () => setPosition({ dimension: position.dimension });

  return (
    <div className="space-y-4">
      {/* Dimension picker — mobile first com flex-wrap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Dimensão de drill-down
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((d) => {
              const active = d.key === position.dimension;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => handleSelectDimension(d.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                  aria-pressed={active}
                >
                  {dimensionIcon(d.key)}
                  <span className="font-medium">{d.label}</span>
                  <span className="hidden sm:inline text-xs opacity-80">{d.description}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Breadcrumbs */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {breadcrumbs.map((step, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={`${step.label}-${idx}`} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(step)}
                    disabled={isLast}
                    className={cn(
                      "rounded px-1.5 py-0.5 transition-colors",
                      isLast
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {step.label}
                  </button>
                  {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </span>
              );
            })}
            <div className="ml-auto flex items-center gap-2">
              {breadcrumbs.length > 1 && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Reiniciar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isLoading && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs do recorte — empilháveis no mobile, 2 colunas no tablet, 4 no desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Total"
          value={stats.total}
          icon={ClipboardList}
        />
        {position.dimension === "audiencia" ? (
          <KPICard title="Inscritos" value={stats.total} icon={Users} />
        ) : (
          <>
            <KPICard
              title="Resolvidos"
              value={stats.resolved}
              icon={Gauge}
              className={stats.resolutionPct >= 70 ? "border-green-500/30" : undefined}
            />
            <KPICard
              title="Críticos"
              value={stats.critical}
              icon={AlertTriangle}
              className={stats.criticalPct >= 30 ? "border-destructive/30" : undefined}
            />
          </>
        )}
        <KPICard
          title="% Resolvidos"
          value={`${stats.resolutionPct}%`}
          icon={Gauge}
        />
      </div>

      {/* Lista do próximo nível OU lista detalhada de relatos/inscritos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {dimensionIcon(position.dimension)}
            {levelLabel(position, stats.isLeaf)}
            {!stats.isLeaf && stats.nextItems.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.nextItems.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats.isLeaf ? (
            <LeafRecordsList records={stats.records} />
          ) : stats.nextItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {def.label === "Audiências"
                ? "Sem inscrições neste recorte."
                : "Sem dados neste recorte. Tente outra dimensão ou reinicie a navegação."}
            </p>
          ) : (
            <ul className="divide-y">
              {stats.nextItems.map((item) => (
                <li
                  key={item.value}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleNextClick(item.value)}
                    className="flex-1 flex items-center gap-2 text-left rounded px-2 py-1 hover:bg-muted transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </button>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{item.count}</Badge>
                    {position.dimension !== "audiencia" && (
                      <span className="text-muted-foreground">{item.resolutionPct}% res.</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeafRecordsList({
  records,
}: {
  records: ReturnType<typeof useMultiDrill>["stats"]["records"];
}) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem registros detalhados neste recorte.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {records.map((rec) => {
        if (rec.kind === "subscription") {
          return (
            <li key={rec.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{rec.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {rec.userEmail} · {rec.bairro}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {rec.audienciaTitle}
                  </p>
                </div>
                <Badge variant="outline">{rec.inscricaoStatus}</Badge>
              </div>
            </li>
          );
        }
        return (
          <li key={rec.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{rec.title}</p>
                {rec.subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{rec.subtitle}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {rec.source} · {new Date(rec.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={statusBadgeVariant(rec.status)}>{rec.status}</Badge>
                {rec.severity !== "Sem classificação" && (
                  <Badge variant="outline" className="text-xs">{rec.severity}</Badge>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
