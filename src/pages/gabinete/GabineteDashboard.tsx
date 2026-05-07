import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Gauge,
  MapPin,
  Send,
  Tag,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KPICard } from "@/components/analytics/KPICard";
import { VereadorLayout } from "@/layouts/VereadorLayout";
import {
  ReferralQuickActions,
  type ReferralStatus,
} from "@/components/vereador/ReferralQuickActions";
import { useGabineteVereador } from "@/hooks/useGabineteVereador";
import { useManifestsVereador } from "@/hooks/useManifestsVereador";
import {
  useReferralsVereador,
  type ReferralsVereadorItem,
} from "@/hooks/useReferralsVereador";
import { useGabineteAnalytics } from "@/hooks/useGabineteAnalytics";

/**
 * HU-1.6 — Dashboard do gabinete (vereador / assessor) com métricas de
 * efetividade, tendência temporal, breakdowns e ações rápidas mobile-first.
 *
 * Estrutura:
 *   - Header com identificação do gabinete
 *   - Painel de 4 KPIs (taxa de resolução, tempos médios, total)
 *   - Gráfico de tendência semanal (recebidos vs resolvidos)
 *   - 2 painéis de breakdown (por categoria e por zona)
 *   - Tabs de status (Pendentes / Em andamento / Resolvidos) com cards
 *     touch-friendly e ações rápidas inline
 *   - Cards de manifestações em aberto
 *
 * O VereadorLayout já é responsivo; este componente complementa com:
 *   - grid `grid-cols-1` por padrão e expansão em md+/lg+
 *   - botões com `min-h-[44px]` para toque mobile
 *   - Tabs como navegação principal entre status (mobile-friendly)
 */

const COLOR_PALETTE = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-1))",
];

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

function formatWeekLabel(weekIso: string): string {
  try {
    return format(parseISO(weekIso), "dd/MM", { locale: ptBR });
  } catch {
    return weekIso.slice(5, 10);
  }
}

export default function GabineteDashboard() {
  const navigate = useNavigate();
  const { vereador, councilMemberId, loading: gabineteLoading } = useGabineteVereador();
  const { items, counts, loading: manifestsLoading } = useManifestsVereador();
  const {
    referrals,
    kpis,
    loading: referralsLoading,
    updateStatus,
  } = useReferralsVereador();
  const { stats: analytics, isLoading: analyticsLoading } =
    useGabineteAnalytics(councilMemberId);

  const loading = gabineteLoading || referralsLoading;
  const [activeTab, setActiveTab] = useState<
    "pendentes" | "em_andamento" | "resolvidos"
  >("pendentes");

  const referralGroups = useMemo(() => {
    return {
      pendentes: referrals.filter(
        (r) => r.status === "pending" || r.status === "sent",
      ),
      em_andamento: referrals.filter((r) => r.status === "acknowledged"),
      resolvidos: referrals.filter((r) => r.status === "resolved").slice(0, 20),
    };
  }, [referrals]);

  const trendData = useMemo(
    () =>
      analytics.timeline.map((p) => ({
        ...p,
        label: formatWeekLabel(p.weekStart),
      })),
    [analytics.timeline],
  );

  return (
    <VereadorLayout>
      <div className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardContent className="p-4 md:p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg md:text-xl font-semibold">
                    {vereador ? `Gabinete de ${vereador.name}` : "Gabinete vinculado"}
                  </h2>
                  {vereador?.party ? (
                    <Badge variant="outline">{vereador.party}</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Monitore os encaminhamentos do gabinete e responda as manifestações
                  que precisam de retorno — acessível também pelo celular para uso
                  em campo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analyticsLoading && analytics.total === 0 ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : (
            <>
              <KPICard
                title="Taxa de resolução"
                subtitle={`${analytics.resolved} de ${analytics.total} encaminhamentos`}
                value={`${analytics.resolutionPct}%`}
                icon={Gauge}
              />
              <KPICard
                title="Tempo médio até receber"
                subtitle="Da chegada ao acknowledge"
                value={formatHours(analytics.avgAckHours)}
                icon={Clock}
              />
              <KPICard
                title="Tempo médio até resolver"
                subtitle="Total ponta a ponta"
                value={formatHours(analytics.avgResolutionHours)}
                icon={CheckCircle2}
              />
              <KPICard
                title="Pendentes de retorno"
                subtitle={`${kpis.pending} aguardando + ${kpis.sent} enviados`}
                value={kpis.pending + kpis.sent}
                icon={TimerReset}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tendência semanal
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Encaminhamentos recebidos vs resolvidos por semana
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                {analyticsLoading && trendData.length === 0 ? (
                  <Skeleton className="h-full w-full" />
                ) : trendData.length === 0 ? (
                  <EmptyChart message="Sem encaminhamentos no histórico ainda." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="recebidos"
                        name="Recebidos"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="resolvidos"
                        name="Resolvidos"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Por categoria
              </CardTitle>
              <p className="text-xs text-muted-foreground">Top categorias dos relatos</p>
            </CardHeader>
            <CardContent>
              <BreakdownChart
                items={analytics.byCategory.slice(0, 6)}
                loading={analyticsLoading}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Por zona da cidade
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Distribuição dos encaminhamentos por região — ajuda a planejar visitas
              em campo
            </p>
          </CardHeader>
          <CardContent>
            <BreakdownChart
              items={analytics.byZone}
              loading={analyticsLoading}
              layout="horizontal"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Encaminhamentos</CardTitle>
            <p className="text-xs text-muted-foreground">
              Toque para abrir; use os botões para mudar o status sem sair da lista
            </p>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger
                  value="pendentes"
                  className="flex flex-col gap-0.5 h-auto py-2"
                >
                  <span className="text-xs">Pendentes</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {referralGroups.pendentes.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="em_andamento"
                  className="flex flex-col gap-0.5 h-auto py-2"
                >
                  <span className="text-xs">Em andamento</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {referralGroups.em_andamento.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="resolvidos"
                  className="flex flex-col gap-0.5 h-auto py-2"
                >
                  <span className="text-xs">Resolvidos</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {analytics.resolved}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pendentes" className="mt-4 space-y-2">
                <ReferralList
                  items={referralGroups.pendentes}
                  loading={referralsLoading}
                  onChangeStatus={updateStatus}
                  emptyMessage="Nenhum encaminhamento pendente. ✓"
                />
              </TabsContent>
              <TabsContent value="em_andamento" className="mt-4 space-y-2">
                <ReferralList
                  items={referralGroups.em_andamento}
                  loading={referralsLoading}
                  onChangeStatus={updateStatus}
                  emptyMessage="Nada em andamento no momento."
                />
              </TabsContent>
              <TabsContent value="resolvidos" className="mt-4 space-y-2">
                <ReferralList
                  items={referralGroups.resolvidos}
                  loading={referralsLoading}
                  onChangeStatus={updateStatus}
                  emptyMessage="Ainda não há encaminhamentos resolvidos no histórico."
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Manifestações em aberto</CardTitle>
              <p className="text-xs text-muted-foreground">
                {counts.total} manifestações aguardando posicionamento do gabinete
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {manifestsLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhuma manifestação em aberto.
                </p>
              ) : (
                items.slice(0, 5).map((item) => (
                  <div
                    key={item.referralId}
                    className="rounded-md border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm leading-snug">{item.title}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {item.manifestType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description || "Sem descrição complementar."}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Links rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="justify-start min-h-[44px]"
                onClick={() => navigate("/gabinete/manifestacoes")}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Ver todas as manifestações
              </Button>
              <Button
                variant="outline"
                className="justify-start min-h-[44px]"
                onClick={() => navigate("/gabinete/encaminhamentos")}
              >
                <Send className="h-4 w-4 mr-2" />
                Gerenciar encaminhamentos
              </Button>
              {vereador?.id ? (
                <Button
                  variant="outline"
                  className="justify-start min-h-[44px]"
                  onClick={() =>
                    navigate(`/institucional/vereadores/${vereador.id}`)
                  }
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Abrir perfil público
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </VereadorLayout>
  );
}

interface BreakdownChartProps {
  items: { label: string; total: number; resolvidos: number; resolutionPct: number }[];
  loading: boolean;
  layout?: "vertical" | "horizontal";
}

function BreakdownChart({ items, loading, layout = "vertical" }: BreakdownChartProps) {
  if (loading && items.length === 0) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (items.length === 0) {
    return <EmptyChart message="Sem dados nesse corte." />;
  }
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={items}
          layout={layout === "vertical" ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.3}
          />
          {layout === "vertical" ? (
            <>
              <XAxis
                type="number"
                allowDecimals={false}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 14)}…` : v)}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <YAxis
                allowDecimals={false}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, _name, item) => [
              value,
              `${item.payload.resolvidos} resolvidos (${item.payload.resolutionPct}%)`,
            ]}
          />
          <Bar
            dataKey="total"
            radius={layout === "vertical" ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          >
            {items.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLOR_PALETTE[i % COLOR_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ReferralListProps {
  items: ReferralsVereadorItem[];
  loading: boolean;
  onChangeStatus: (id: string, status: ReferralStatus) => Promise<void> | void;
  emptyMessage: string;
}

function ReferralList({
  items,
  loading,
  onChangeStatus,
  emptyMessage,
}: ReferralListProps) {
  if (loading && items.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ReferralRow key={item.id} item={item} onChangeStatus={onChangeStatus} />
      ))}
    </div>
  );
}

interface ReferralRowProps {
  item: ReferralsVereadorItem;
  onChangeStatus: (id: string, status: ReferralStatus) => Promise<void> | void;
}

function ReferralRow({ item, onChangeStatus }: ReferralRowProps) {
  const [updating, setUpdating] = useState(false);

  const handle = async (next: ReferralStatus) => {
    setUpdating(true);
    try {
      await onChangeStatus(item.id, next);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug">{item.manifestTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {item.manifestDescription || item.citizen_message || "Sem descrição."}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px]">
              {item.manifestType}
            </Badge>
            {item.manifestProtocol && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                #{item.manifestProtocol}
              </span>
            )}
          </div>
        </div>
      </div>
      <ReferralQuickActions
        status={item.status as ReferralStatus}
        onChangeStatus={handle}
        isUpdating={updating}
        size="sm"
      />
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}
