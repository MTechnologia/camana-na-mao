import { useMemo } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Compass,
  Gauge,
  MapPin,
  Tag,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/analytics/KPICard";
import { DrillNavBar } from "@/components/analytics/DrillNavBar";
import { cn } from "@/lib/utils";
import {
  useMultiDrill,
  type DrillDimension,
  type MultiDrillPosition,
} from "@/hooks/useMultiDrill";
import {
  useUrlSyncedState,
  type FieldSerializer,
  optionalStringSerializer,
} from "@/hooks/useUrlSyncedState";
import { useDrillKeyboardShortcuts } from "@/hooks/useDrillKeyboardShortcuts";
import { useReportDetailModal } from "@/contexts/ReportDetailContext";

const dimensionSerializer: FieldSerializer<DrillDimension> = {
  toParam: (v) => (v === "categoria" ? null : v),
  fromParam: (raw) => {
    if (raw === "tempo" || raw === "status" || raw === "audiencia") return raw;
    return "categoria";
  },
};

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
  // Estado sincronizado com URL (?dr.dimension, ?dr.level1, ?dr.level2, ?dr.level3)
  const [position, setPosition] = useUrlSyncedState<MultiDrillPosition>({
    prefix: "dr",
    defaults: { dimension: "categoria", level1: null, level2: null, level3: null },
    serializers: {
      dimension: dimensionSerializer,
      level1: optionalStringSerializer(),
      level2: optionalStringSerializer(),
      level3: optionalStringSerializer(),
    },
  });
  const { stats, isLoading, error, refresh } = useMultiDrill(position);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(position), [position]);
  const def = useMemo(() => dimensionDef(position.dimension), [position.dimension]);

  const handleSelectDimension = (d: DrillDimension) => {
    setPosition({ dimension: d, level1: null, level2: null, level3: null });
  };

  const handleNextClick = (value: string) => {
    if (!position.level1) {
      setPosition({ dimension: position.dimension, level1: value, level2: null, level3: null });
    } else if (!position.level2) {
      setPosition({
        dimension: position.dimension,
        level1: position.level1,
        level2: value,
        level3: null,
      });
    } else if (!position.level3) {
      setPosition({ ...position, level3: value });
    }
  };

  const handleBreadcrumbClick = (step: BreadcrumbStep) =>
    setPosition({
      dimension: position.dimension,
      level1: step.position.level1 ?? null,
      level2: step.position.level2 ?? null,
      level3: step.position.level3 ?? null,
    });
  const handleReset = () =>
    setPosition({ dimension: position.dimension, level1: null, level2: null, level3: null });

  // HU-3.3 — drill-up: Backspace volta um nível, Esc volta ao topo da dimensão
  const handleUp = () => {
    if (position.level3) setPosition({ ...position, level3: null });
    else if (position.level2) setPosition({ ...position, level2: null, level3: null });
    else if (position.level1) setPosition({ ...position, level1: null, level2: null, level3: null });
  };
  useDrillKeyboardShortcuts({ onUp: handleUp, onReset: handleReset });

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

      {/* Navegação drill: Voltar + Início + Breadcrumbs + Atualizar (HU-3.3) */}
      <Card>
        <CardContent className="py-3">
          <DrillNavBar
            steps={breadcrumbs.map((s, i) => ({ label: s.label, key: `${s.label}-${i}` }))}
            onStepClick={(idx) => handleBreadcrumbClick(breadcrumbs[idx])}
            onUp={handleUp}
            onReset={handleReset}
            onRefresh={refresh}
            isLoading={isLoading}
          />
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
  const { open: openReport } = useReportDetailModal();
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
        const reportSource =
          rec.source === "urbano" ? "urban" :
          rec.source === "transporte" ? "transport" : null;
        const clickable = !!reportSource;
        return (
          <li
            key={rec.id}
            className={clickable ? "py-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded transition-colors" : "py-3"}
            onClick={() => clickable && reportSource && openReport(rec.id, reportSource)}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && reportSource && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                openReport(rec.id, reportSource);
              }
            }}
          >
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
