import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Smile,
  AlertTriangle,
  MapPin,
  Mic2,
  ChevronRight,
  Star,
} from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { KPICard } from "@/components/analytics/KPICard";
import { ChartCard } from "@/components/analytics/ChartCard";
import { HeatmapChart } from "@/components/analytics/HeatmapChart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalyticsDashboardSummary } from "@/hooks/useAnalyticsDashboardSummary";
import { useWorstServicesByDimension } from "@/hooks/useWorstServicesByDimension";
import {
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
  type ServiceRatingDimensionKey,
} from "@/lib/serviceRatingDimensions";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const CITYWIDE = "__all__";

type PeriodPreset = "30" | "90" | "365" | "all";

function rangeFromPreset(preset: PeriodPreset): { from?: Date; to?: Date } {
  if (preset === "all") return {};
  const to = new Date();
  const from = new Date();
  const days = preset === "30" ? 30 : preset === "90" ? 90 : 365;
  from.setDate(from.getDate() - days);
  return { from, to };
}

function periodLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

/**
 * Painel "Minha Cidade" — visão do munícipe (todo cidadão logado).
 *
 * Reaproveita os agregados sem PII de get_analytics_dashboard_summary e reenquadra
 * para o cidadão: foco em transparência, recorte por bairro e serviços para
 * acompanhar. As análises pesadas (demografia, IA, correlação) ficam no /paineis.
 *
 * NOTA: a RPC get_analytics_dashboard_summary hoje exige perfil staff/engajado e
 * não aceita filtro por região — por isso o recorte "Meu bairro" é derivado no
 * cliente a partir de top_regions. Liberar para todo cidadão + filtro por bairro
 * server-side depende de ajuste na RPC (migração, fluxo do time).
 */
const MinhaCidade = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodPreset>("90");
  const [region, setRegion] = useState<string>(CITYWIDE);
  const [dimension, setDimension] = useState<ServiceRatingDimensionKey>("atendimento");

  const range = useMemo(() => rangeFromPreset(period), [period]);
  const { data: summary, loading, error } = useAnalyticsDashboardSummary(range);
  const { rows: worstServices, loading: worstLoading } = useWorstServicesByDimension(dimension, 5);

  const kpis = summary?.kpis;
  const topRegions = useMemo(() => summary?.top_regions ?? [], [summary]);

  const regionHighlight = useMemo(() => {
    if (region === CITYWIDE) return null;
    const idx = topRegions.findIndex((r) => r.name === region);
    if (idx < 0) return { name: region, value: 0, rank: null as number | null };
    return { name: region, value: topRegions[idx].value, rank: idx + 1 };
  }, [region, topRegions]);

  const timeSeriesData = (summary?.time_series ?? []).map((t) => ({
    name: periodLabel(t.period),
    reports: t.reports,
    satisfaction: t.satisfaction,
  }));
  const categoryData = summary?.category_distribution ?? [];
  const heatmapData =
    summary?.heatmap && summary.heatmap.length > 0 ? summary.heatmap : [{ x: "—", y: "—", value: 0 }];

  const lastUpdated = summary?.range?.end
    ? new Date(summary.range.end).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Minha Cidade" />

      <div className="pt-[60px] pb-24 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        <p className="text-sm text-muted-foreground mb-4">
          Um retrato da cidade a partir do que a população relata e avalia. Escolha o período e o
          seu bairro para ver o que está acontecendo perto de você.
        </p>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
            <SelectTrigger className="sm:w-48" aria-label="Período">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Últimos 12 meses</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="sm:w-56" aria-label="Bairro">
              <SelectValue placeholder="Bairro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CITYWIDE}>Toda a cidade</SelectItem>
              {topRegions.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>
              Não foi possível carregar os indicadores agora ({error}). Esta é a visão do munícipe —
              para liberá-la a todo cidadão, a base de dados (RPC) precisa permitir leitura
              agregada; isso entra no fluxo do time.
            </AlertDescription>
          </Alert>
        )}

        {/* Destaque do bairro selecionado */}
        {regionHighlight && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm">
                No bairro <strong>{regionHighlight.name}</strong>:{" "}
                <strong>{regionHighlight.value.toLocaleString("pt-BR")}</strong> relatos no período
                {regionHighlight.rank
                  ? ` — ${regionHighlight.rank}º entre os bairros que mais relatam.`
                  : " (fora do top de bairros mais ativos)."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        {loading && !summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            <KPICard
              title="Relatos na cidade"
              value={(kpis?.totalReports.current ?? 0).toLocaleString("pt-BR")}
              icon={TrendingUp}
              subtitle="Relatos urbanos e de transporte no período"
            />
            <KPICard
              title="Satisfação com serviços"
              value={`${kpis?.positiveRate.current ?? 0}%`}
              icon={Smile}
              subtitle="Avaliações 4–5 estrelas dos equipamentos públicos"
            />
            <KPICard
              title="Pontos de atenção"
              value={kpis?.criticalIssues.current ?? 0}
              icon={AlertTriangle}
              subtitle="Relatos de alta criticidade no período"
            />
            <KPICard
              title="Bairros ativos"
              value={kpis?.activeRegions.current ?? 0}
              icon={MapPin}
              subtitle="Bairros com relatos registrados"
            />
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <ChartCard
            title="Como evoluiu"
            subtitle="Relatos e satisfação ao longo do tempo"
            lastUpdated={lastUpdated}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={timeSeriesData.length ? timeSeriesData : [{ name: "—", reports: 0, satisfaction: 0 }]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="reports" stroke="hsl(var(--primary))" strokeWidth={2} name="Relatos" />
                <Line type="monotone" dataKey="satisfaction" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Satisfação (%)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="O que mais aparece"
            subtitle="Distribuição dos relatos por categoria"
            lastUpdated={lastUpdated}
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData.length ? categoryData : [{ name: "Sem dados", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={95}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard
          title="Onde se concentra"
          subtitle="Relatos por região e dia da semana"
          lastUpdated={lastUpdated}
          className="mb-6"
        >
          <HeatmapChart data={heatmapData} />
        </ChartCard>

        <ChartCard
          title="Bairros que mais relatam"
          subtitle="Top 10 no período"
          lastUpdated={lastUpdated}
          className="mb-6"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRegions.length ? topRegions : [{ name: "Sem dados", value: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Serviços para acompanhar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Serviços para ficar de olho</h3>
                <p className="text-sm text-muted-foreground">
                  Equipamentos com as piores notas dos cidadãos nesta dimensão.
                </p>
              </div>
              <Select value={dimension} onValueChange={(v) => setDimension(v as ServiceRatingDimensionKey)}>
                <SelectTrigger className="sm:w-52" aria-label="Dimensão">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_RATING_DIMENSION_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {SERVICE_RATING_DIMENSION_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {worstLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : worstServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há avaliações suficientes para esta dimensão.
              </p>
            ) : (
              <ul className="divide-y">
                {worstServices.map((s) => (
                  <li key={s.service_id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/servico/${s.service_id}`)}
                      className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-accent/50 rounded-md px-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.service_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.district} · {s.rating_count} avaliações
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {s.avg_score.toFixed(1)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Participação */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mic2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Participe das decisões</h3>
                <p className="text-sm text-muted-foreground">
                  Veja as audiências públicas abertas e inscreva-se para opinar.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/audiencias")} className="gap-2 flex-shrink-0">
              Ver audiências
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MinhaCidade;
