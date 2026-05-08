import { useMemo } from "react";
import { GitMerge, RefreshCw, Users, BarChart3, Calendar, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemographicHeatmap } from "@/components/analytics/DemographicHeatmap";
import {
  useDemographicCrossAnalytics,
  type DemoAxis,
  type ReportCategory,
} from "@/hooks/useDemographicCrossAnalytics";
import { useDrillInsight } from "@/hooks/useDrillInsight";
import { DrillInsightPanel } from "@/components/analytics/DrillInsightPanel";
import { useUrlSyncedState, type FieldSerializer } from "@/hooks/useUrlSyncedState";
import { cn } from "@/lib/utils";

/**
 * Aba "Cruzamentos" do dashboard administrativo (HU-3.4).
 *
 * Drill-across entre tipo de problema (categoria) e perfil demográfico do
 * autor do relato. Quatro eixos: gênero, raça/cor, classe social e faixa
 * etária. Click em célula da matriz abre painel de drill-into com a lista
 * dos relatos correspondentes.
 */

interface AxisDef {
  key: DemoAxis;
  label: string;
  description: string;
}

const AXES: AxisDef[] = [
  { key: "gender", label: "Gênero", description: "Sexo autodeclarado" },
  { key: "age_group", label: "Faixa etária", description: "Idade do reportante" },
  { key: "race", label: "Raça/Cor", description: "Cor autodeclarada" },
  { key: "social_class", label: "Classe social", description: "Classe econômica" },
];

const axisIcon = (a: DemoAxis) => {
  if (a === "gender") return <Users className="h-4 w-4" />;
  if (a === "age_group") return <Calendar className="h-4 w-4" />;
  if (a === "race") return <Heart className="h-4 w-4" />;
  return <BarChart3 className="h-4 w-4" />;
};

const axisSerializer: FieldSerializer<DemoAxis> = {
  toParam: (v) => (v === "gender" ? null : v),
  fromParam: (raw) => {
    if (raw === "race" || raw === "social_class" || raw === "age_group") return raw;
    return "gender";
  },
};

export function CrossAnalyticsTab() {
  // Eixo demográfico ativo sincronizado com URL (?cross.axis=gender|race|...)
  const [axisState, setAxisState] = useUrlSyncedState<{ axis: DemoAxis }>({
    prefix: "cross",
    defaults: { axis: "gender" },
    serializers: { axis: axisSerializer },
  });
  const axis = axisState.axis;

  const { matrix, isLoading, error, refresh } = useDemographicCrossAnalytics(axis);
  const drillInsight = useDrillInsight();

  const activeAxis = useMemo(() => AXES.find((a) => a.key === axis) ?? AXES[0], [axis]);

  const handleCellClick = (
    category: ReportCategory,
    demoValue: string,
    demoLabel: string,
    _count: number,
  ) => {
    // HU-3.4 fix — usa busca cruzada (categoria macro x eixo demografico)
    void drillInsight.searchByCrossDemographic(category, axis, demoValue, demoLabel);
  };

  return (
    <div className="space-y-4">
      {/* Header com seletor de eixo + atualizar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Eixo demográfico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {AXES.map((a) => {
              const active = a.key === axis;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAxisState({ axis: a.key })}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                  aria-pressed={active}
                >
                  {axisIcon(a.key)}
                  <span className="font-medium">{a.label}</span>
                  <span className="hidden sm:inline text-xs opacity-80">{a.description}</span>
                </button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="ml-auto"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {activeAxis.label} × Tipo de relato
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Toque em uma célula para ver os relatos que cruzam aquele tipo com o perfil escolhido.
            Cor mais escura indica maior concentração de relatos.
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <DemographicHeatmap
              matrix={matrix}
              isLoading={isLoading}
              onCellClick={handleCellClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Drill-into: lista de relatos da célula clicada */}
      <DrillInsightPanel state={drillInsight.state} onClose={drillInsight.close} />
    </div>
  );
}
