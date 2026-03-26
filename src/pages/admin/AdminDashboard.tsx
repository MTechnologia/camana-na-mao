import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { KPICard } from '@/components/analytics/KPICard';
import { StatusDonut } from '@/components/analytics/StatusDonut';
import { SentimentGauge } from '@/components/analytics/SentimentGauge';
import { RiskDistribution } from '@/components/analytics/RiskDistribution';
import { ExportDialog } from '@/components/analytics/ExportDialog';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { useSentimentAnalytics } from '@/hooks/useSentimentAnalytics';
import { useImpactAnalytics } from '@/hooks/useImpactAnalytics';
import { useRoutesUsageAdminStats } from '@/hooks/useRoutesUsageAdminStats';
import { useEquipmentOccupancyAdminStats } from '@/hooks/useEquipmentOccupancyAdminStats';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeatmapChart } from '@/components/analytics/HeatmapChart';
import { CompactBarChart } from '@/components/analytics/CompactBarChart';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  Download,
  RefreshCw,
  Clock,
  ChevronRight,
  MessageSquare,
  Users,
  PieChart,
  Route,
  Coins,
  Layers
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showExport, setShowExport] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const { stats, isLoading, refresh } = useReportsAnalytics();
  const { stats: sentimentStats } = useSentimentAnalytics();
  const { stats: impactStats } = useImpactAnalytics();
  const routesUsageStats = useRoutesUsageAdminStats();
  const occupancyStats = useEquipmentOccupancyAdminStats();

  // Marcar como carregado após primeira carga completa
  useMemo(() => {
    if (!isLoading && stats && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [isLoading, stats, initialLoadDone]);

  // Mostrar skeleton estável durante carga inicial
  if (!initialLoadDone || isLoading || !stats) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="h-12 w-full bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const quickLinks = [
    {
      title: 'Ver Relatos',
      description: 'Gerenciar relatos e solicitações',
      icon: MessageSquare,
      href: '/admin/reports',
      badge: stats.pending,
    },
    {
      title: 'Análise Detalhada',
      description: 'Dashboards e filtros avançados',
      icon: PieChart,
      href: '/admin/analytics',
    },
    {
      title: 'Gestão de Usuários',
      description: 'Administrar perfis e permissões',
      icon: Users,
      href: '/admin/users',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão executiva para tomada de decisão rápida
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Main KPIs - Big Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total de Relatos"
            value={stats.total}
            trend={{ value: stats.trend, direction: stats.trend >= 0 ? 'up' : 'down' }}
            icon={BarChart3}
          />
          <KPICard
            title="Críticos"
            value={stats.critical}
            icon={AlertTriangle}
            className="border-destructive/30"
          />
          <KPICard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
          />
          <KPICard
            title="Resolvidos"
            value={stats.resolved}
            trend={{ value: Math.abs(stats.resolvedTrend), direction: stats.resolvedTrend >= 0 ? 'up' : 'down' }}
            icon={CheckCircle2}
            className="border-green-500/30"
          />
        </div>

        {/* Routes cost monitoring (30d) */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Uso de Rotas (30 dias)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Eventos Matrix"
              value={routesUsageStats.loading ? "..." : routesUsageStats.events30d}
              icon={Route}
              subtitle="execuções do cálculo de rotas"
            />
            <KPICard
              title="Elements (origem x destino)"
              value={routesUsageStats.loading ? "..." : routesUsageStats.elements30d}
              icon={Layers}
              subtitle="base para estimativa de custo"
            />
            <KPICard
              title="Cache Hit"
              value={routesUsageStats.loading ? "..." : `${routesUsageStats.cacheHitRate30d}%`}
              icon={CheckCircle2}
              subtitle="consultas reaproveitadas"
            />
            <KPICard
              title="Custo Estimado (BRL)"
              value={
                routesUsageStats.loading
                  ? "..."
                  : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      routesUsageStats.estimatedCost30dBrl
                    )
              }
              icon={Coins}
              subtitle="estimativa interna via elements"
            />
          </div>
        </div>

        {/* Equipment occupancy */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Ocupação de Equipamentos (último ping)</h2>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Subdividido por equipamento: selecione um para ver Heatmap (por hora) e gráfico diário.
            </div>
            <div className="w-full md:w-72">
              <Select
                value={occupancyStats.selectedServiceId || ""}
                onValueChange={(v) => occupancyStats.setSelectedServiceId(v)}
                disabled={occupancyStats.loadingTop}
              >
                <SelectTrigger>
                  <SelectValue placeholder={occupancyStats.loadingTop ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {occupancyStats.topEquipments.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {occupancyStats.loadingTop ? "Carregando..." : "Sem dados para exibir"}
                    </SelectItem>
                  ) : (
                    occupancyStats.topEquipments.map((eq) => (
                      <SelectItem key={eq.service_id} value={eq.service_id}>
                        {eq.service_name ? eq.service_name : `Equipamento ${eq.service_id.slice(0, 6)}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-md font-semibold mb-4">Por hora (últimos 7 dias)</h3>
              {occupancyStats.loadingCharts ? (
                <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
              ) : (
                <HeatmapChart data={occupancyStats.heatmap} />
              )}
            </Card>
            <Card className="p-6">
              <h3 className="text-md font-semibold mb-4">Por dia (últimos 14 dias)</h3>
              {occupancyStats.loadingCharts ? (
                <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
              ) : (
                <div className="h-[360px]">
                  <CompactBarChart
                    data={occupancyStats.dailyBars}
                    total={occupancyStats.dailyTotal}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quick Stats - 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Índice de Satisfação</h3>
            <div className="h-48 flex items-center justify-center">
              {sentimentStats ? (
                <SentimentGauge 
                  score={sentimentStats.overallScore ?? 0} 
                  trend={sentimentStats.trend ?? 0}
                />
              ) : (
                <span className="text-muted-foreground text-sm">Carregando...</span>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status dos Relatos</h3>
            <div className="h-48">
              <StatusDonut 
                data={stats.byStatus} 
                total={stats.total}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Risco</h3>
            <div className="h-48">
              {impactStats?.byRiskLevel ? (
                <RiskDistribution 
                  data={impactStats.byRiskLevel}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Card 
              key={link.href}
              className="p-6 cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => navigate(link.href)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <link.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {link.title}
                      {link.badge && link.badge > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                          {link.badge}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {link.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Card>
          ))}
        </div>

        {/* Export Dialog */}
        <ExportDialog 
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          exportType="all"
          estimatedRows={stats.total}
          analyticsStats={stats}
          sentimentStats={sentimentStats}
        />
      </div>
    </AdminLayout>
  );
}
