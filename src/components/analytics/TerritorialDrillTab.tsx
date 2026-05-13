import {
  AlertTriangle,
  ChevronRight,
  Compass,
  Gauge,
  MapPin,
  RefreshCw,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/analytics/KPICard";
import { cn } from "@/lib/utils";
import {
  useTerritorialDrill,
  type DrillPosition,
} from "@/hooks/useTerritorialDrill";
import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";
import { DrillNavBar } from "@/components/analytics/DrillNavBar";
import { useUrlSyncedState, optionalStringSerializer } from "@/hooks/useUrlSyncedState";
import { useDrillKeyboardShortcuts } from "@/hooks/useDrillKeyboardShortcuts";

/**
 * Aba "Territorial" do dashboard administrativo (HU-3.1).
 *
 * Drill-down hierárquico Zona → Bairro → Rua com breadcrumbs clicáveis no
 * topo. Em cada nível mostra: 4 KPIs (volume + breakdown por tipo, taxa de
 * resolução, score de criticidade), top 5 categorias e a lista do próximo
 * nível para descer.
 */

interface BreadcrumbStep {
  label: string;
  level: "raiz" | "zona" | "bairro" | "rua";
  position: DrillPosition;
}

function buildBreadcrumbs(position: DrillPosition): BreadcrumbStep[] {
  const steps: BreadcrumbStep[] = [
    { label: "São Paulo", level: "raiz", position: {} },
  ];
  if (position.zona) {
    steps.push({
      label: String(position.zona),
      level: "zona",
      position: { zona: position.zona },
    });
  }
  if (position.bairro) {
    steps.push({
      label: position.bairro,
      level: "bairro",
      position: { zona: position.zona, bairro: position.bairro },
    });
  }
  if (position.rua) {
    steps.push({
      label: position.rua,
      level: "rua",
      position: { ...position },
    });
  }
  return steps;
}

function levelLabel(
  next: "zona" | "bairro" | "rua" | null,
  current: "zona" | "bairro" | "rua",
): string {
  if (next === "zona") return "Selecione uma zona para detalhar";
  if (next === "bairro") return "Bairros desta zona";
  if (next === "rua") return "Ruas deste bairro";
  if (current === "bairro") return "Detalhamento de rua";
  return "Nível mais detalhado alcançado";
}

function scoreColorClass(score: number): string {
  if (score >= 70) return "bg-destructive text-destructive-foreground";
  if (score >= 40) return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Crítico";
  if (score >= 40) return "Moderado";
  return "Baixo";
}

export function TerritorialDrillTab() {
  // HU-3.3 — estado sincronizado com URL (?ter.zona, ?ter.bairro, ?ter.rua)
  const [position, setPosition] = useUrlSyncedState<DrillPosition>({
    prefix: "ter",
    defaults: { zona: null, bairro: null, rua: null },
    serializers: {
      zona: optionalStringSerializer() as never,
      bairro: optionalStringSerializer(),
      rua: optionalStringSerializer(),
    },
  });
  const { stats, isLoading, error, refresh } = useTerritorialDrill(position);

  const breadcrumbs = buildBreadcrumbs(position);

  const goTo = (newPosition: DrillPosition) =>
    setPosition({
      zona: (newPosition.zona ?? null) as ZonaVolumeOuDesconhecida | null,
      bairro: newPosition.bairro ?? null,
      rua: newPosition.rua ?? null,
    });

  const handleNextClick = (label: string) => {
    if (stats.nextLevel === "zona") {
      goTo({ zona: label as ZonaVolumeOuDesconhecida });
    } else if (stats.nextLevel === "bairro") {
      goTo({ zona: position.zona, bairro: label });
    } else if (stats.nextLevel === "rua") {
      goTo({ zona: position.zona, bairro: position.bairro, rua: label });
    }
  };

  // HU-3.3 — drill-up via botão Voltar e atalhos Backspace/Esc
  const handleUp = () => {
    if (position.rua) goTo({ zona: position.zona, bairro: position.bairro });
    else if (position.bairro) goTo({ zona: position.zona });
    else if (position.zona) goTo({});
  };
  const handleResetRoot = () => goTo({});
  useDrillKeyboardShortcuts({ onUp: handleUp, onReset: handleResetRoot });

  if (error) {
    return (
      <Card className="p-6 flex flex-col items-center gap-3 border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-destructive text-center">{error}</p>
        <Button onClick={() => void refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* HU-3.3 — Navegação drill: Voltar + Início + Breadcrumbs + Atualizar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <DrillNavBar
              steps={breadcrumbs.map((s) => ({ label: s.label, key: `${s.level}-${s.label}` }))}
              onStepClick={(idx) => goTo(breadcrumbs[idx].position)}
              onUp={handleUp}
              onReset={handleResetRoot}
              onRefresh={() => void refresh()}
              isLoading={isLoading}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading && stats.total === 0 ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KPICard
              title="Volume de relatos"
              subtitle={
                stats.total > 0
                  ? `${stats.urbano} U • ${stats.transporte} T • ${stats.avaliacao} A`
                  : "no recorte selecionado"
              }
              value={stats.total}
              icon={MapPin}
            />
            <KPICard
              title="Taxa de resolução"
              subtitle={`${stats.resolved} de ${stats.total} resolvidos`}
              value={`${stats.resolutionPct}%`}
              icon={Gauge}
            />
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs text-muted-foreground">Score de criticidade</p>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-semibold tabular-nums">{stats.criticidadeScore}</p>
                <Badge className={cn("text-[10px]", scoreColorClass(stats.criticidadeScore))}>
                  {scoreLabel(stats.criticidadeScore)}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Negativo {stats.scoreBreakdown.negativePct}% • Crítico {stats.scoreBreakdown.criticalPct}%
              </p>
            </Card>
            <KPICard
              title="Categorias distintas"
              subtitle="Diversidade de problemas"
              value={stats.topCategories.length}
              icon={Tag}
            />
          </>
        )}
      </div>

      {/* Top 5 categorias do recorte */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Top 5 categorias neste recorte
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            O que mais aparece em {breadcrumbs[breadcrumbs.length - 1].label}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading && stats.topCategories.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : stats.topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum relato neste recorte.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.topCategories.map((c, i) => {
                const pct = stats.total > 0 ? Math.round((c.count / stats.total) * 100) : 0;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold tabular-nums shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-sm truncate">{c.category}</p>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {c.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximo nível */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {levelLabel(stats.nextLevel, stats.currentLevel)}
          </CardTitle>
          {stats.nextLevel && (
            <p className="text-xs text-muted-foreground">
              Toque para descer um nível e ver os relatos detalhados
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!stats.nextLevel ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {stats.currentLevel === "rua"
                ? "✓ Você está no nível mais detalhado (rua). Ajuste o breadcrumb para subir."
                : stats.currentLevel === "bairro"
                  ? "Sem detalhamento de rua disponível para este bairro. Os relatos não têm o campo de rua preenchido."
                  : "Sem subníveis disponíveis."}
            </p>
          ) : isLoading && stats.nextItems.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : stats.nextItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum subnível disponível neste recorte.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1">
              {stats.nextItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNextClick(item.label)}
                  disabled={item.count === 0}
                  className={cn(
                    "rounded-md border border-border p-3 text-left transition-colors",
                    item.count > 0
                      ? "hover:bg-muted/40 hover:border-primary/40 cursor-pointer"
                      : "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>
                      {item.count} relato{item.count === 1 ? "" : "s"}
                    </span>
                    {item.count > 0 && <span>{item.resolutionPct}% resolvidos</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
