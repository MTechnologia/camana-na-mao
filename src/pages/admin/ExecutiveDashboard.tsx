import { useState, useMemo } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { KPICard } from '@/components/analytics/KPICard';
import { StatusDonut } from '@/components/analytics/StatusDonut';
import { SentimentGauge } from '@/components/analytics/SentimentGauge';
import { RegionalHotspots } from '@/components/analytics/RegionalHotspots';
import { RiskDistribution } from '@/components/analytics/RiskDistribution';
import { TimeDistributionChart } from '@/components/analytics/TimeDistributionChart';
import { HotspotsList } from '@/components/analytics/HotspotsList';
import { PatternAlerts } from '@/components/analytics/PatternAlerts';
import { DrillInsightPanel } from '@/components/analytics/DrillInsightPanel';
import { ExportDialog } from '@/components/analytics/ExportDialog';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { useSentimentAnalytics } from '@/hooks/useSentimentAnalytics';
import { useImpactAnalytics } from '@/hooks/useImpactAnalytics';
import { useCorrelationAnalytics } from '@/hooks/useCorrelationAnalytics';
import { useDrillInsight } from '@/hooks/useDrillInsight';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Download,
  RefreshCw,
  Clock,
  MapPin,
  Users
} from 'lucide-react';

const ExecutiveDashboard = () => {
  const [showExport, setShowExport] = useState(false);
  const { stats, isLoading, refresh } = useReportsAnalytics();
  const { stats: sentimentStats } = useSentimentAnalytics();
  const { stats: impactStats } = useImpactAnalytics();
  const correlations = useCorrelationAnalytics();
  const drillInsight = useDrillInsight();

  // Transform peak hours for chart
  const peakHoursData = useMemo(() => {
    return (correlations.peakHours || []).slice(0, 24).map(item => ({
      label: `${item.hour}h`,
      count: item.count
    })).sort((a, b) => parseInt(a.label) - parseInt(b.label));
  }, [correlations.peakHours]);

  // Transform weekday distribution for chart
  const weekdayData = useMemo(() => {
    return (correlations.weekdayDistribution || []).map(item => ({
      label: item.day.slice(0, 3),
      count: item.count
    }));
  }, [correlations.weekdayDistribution]);

  if (isLoading || !stats) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Executivo</h1>
            <p className="text-muted-foreground">
              Visão consolidada para tomada de decisão
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total de Relatos"
            value={stats.total}
            trend={{ value: stats.trend, direction: stats.trend >= 0 ? 'up' : 'down' }}
            icon={BarChart3}
            onClick={() => drillInsight.searchByOverview()}
          />
          <KPICard
            title="Críticos"
            value={stats.critical}
            icon={AlertTriangle}
            className="border-destructive/30"
            onClick={() => drillInsight.searchBySeverity('crítico')}
          />
          <KPICard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
            onClick={() => drillInsight.searchByStatus('pendente')}
          />
          <KPICard
            title="Resolvidos"
            value={stats.resolved}
            trend={{ value: 15, direction: 'up' }}
            icon={CheckCircle2}
            className="border-green-500/30"
            onClick={() => drillInsight.searchByStatus('resolvido')}
          />
        </div>

        {/* Second Row: Gauges and Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Gauge */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Índice de Satisfação</h3>
            <div className="h-48 flex items-center justify-center">
              {sentimentStats ? (
                <SentimentGauge 
                  score={sentimentStats.overallScore ?? 0} 
                  trend={sentimentStats.trend ?? 0}
                  onClick={() => drillInsight.searchByOverview()}
                />
              ) : (
                <span className="text-muted-foreground text-sm">Carregando...</span>
              )}
            </div>
          </Card>

          {/* Risk Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Risco</h3>
            <div className="h-48">
              {impactStats?.byRiskLevel ? (
                <RiskDistribution 
                  data={impactStats.byRiskLevel}
                  onSegmentClick={(risk) => drillInsight.searchBySeverity(risk)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
              )}
            </div>
          </Card>

          {/* Status Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status dos Relatos</h3>
            <div className="h-48">
              <StatusDonut 
                data={stats.byStatus} 
                total={stats.total}
                onSegmentClick={(status) => drillInsight.searchByStatus(status)}
              />
            </div>
          </Card>
        </div>

        {/* Third Row: Regional Hotspots and Top Regions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Hotspots - sem dependência externa */}
          <RegionalHotspots 
            data={correlations.hotspots || []}
            onRegionClick={(region) => drillInsight.searchByRegion(region)}
          />

          {/* Hotspots List */}
          <HotspotsList 
            hotspots={correlations.hotspots || []}
            onHotspotClick={(region) => {
              drillInsight.searchByRegion(region);
            }}
          />
        </div>

        {/* Fourth Row: Time Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TimeDistributionChart
            data={peakHoursData}
            title="Distribuição por Hora"
            type="hour"
            onBarClick={(label) => drillInsight.searchByPeriod(label)}
          />
          <TimeDistributionChart
            data={weekdayData}
            title="Distribuição por Dia da Semana"
            type="weekday"
            onBarClick={(label) => drillInsight.searchByPeriod(label)}
          />
        </div>

        {/* Fifth Row: Critical Categories and Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Critical Categories */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-lg font-semibold">Categorias Mais Críticas</h3>
            </div>
            <div className="space-y-3">
              {(correlations.topCriticalCategories || []).map((item, index) => (
                <div 
                  key={item.category}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => drillInsight.searchByCategory(item.category)}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.category}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.criticalCount} críticos ({item.percentage}%)
                    </div>
                  </div>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!correlations.topCriticalCategories || correlations.topCriticalCategories.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma categoria crítica identificada
                </div>
              )}
            </div>
          </Card>

          {/* Pattern Alerts */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Alertas de Padrões</h3>
            </div>
            <PatternAlerts 
              alerts={stats.criticality.patterns}
              onAlertClick={(alert) => drillInsight.searchByCategory(alert.title || '')}
            />
          </Card>
        </div>

        {/* Regional Distribution */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Distribuição Regional</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(stats.demographics?.byRegion || []).slice(0, 10).map((region) => (
              <div 
                key={region.region} 
                className="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => drillInsight.searchByRegion(region.region)}
              >
                <div className="font-medium text-sm truncate" title={region.region}>
                  {region.region}
                </div>
                <div className="text-2xl font-bold text-primary">{region.count}</div>
                <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${stats.total > 0 ? (region.count / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Drill Insight Panel */}
        <DrillInsightPanel
          state={drillInsight.state}
          onClose={drillInsight.close}
        />

        {/* Export Dialog */}
        <ExportDialog 
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          exportType="all"
        />
      </div>
    </AdminLayout>
  );
};

export default ExecutiveDashboard;
