import { useState, useMemo } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KPICard } from '@/components/analytics/KPICard';
import { StatusDonut } from '@/components/analytics/StatusDonut';
import { CategoryBarChart } from '@/components/analytics/CategoryBarChart';
import { DemographicsPieChart } from '@/components/analytics/DemographicsPieChart';
import { AgePyramid } from '@/components/analytics/AgePyramid';
import { EngagementFunnel } from '@/components/analytics/EngagementFunnel';
import { TopReportsList } from '@/components/analytics/TopReportsList';
import { CriticalityGauge } from '@/components/analytics/CriticalityGauge';
import { PatternAlerts } from '@/components/analytics/PatternAlerts';
import { SentimentGauge } from '@/components/analytics/SentimentGauge';
import { SentimentDonut } from '@/components/analytics/SentimentDonut';
import { SentimentTrend } from '@/components/analytics/SentimentTrend';
import { WordCloud } from '@/components/analytics/WordCloud';
import { SentimentDrivers } from '@/components/analytics/SentimentDrivers';
import { AIInsightsCard } from '@/components/analytics/AIInsightsCard';
import { RegionalHotspots } from '@/components/analytics/RegionalHotspots';
import { HotspotsList } from '@/components/analytics/HotspotsList';
import { TimeDistributionChart } from '@/components/analytics/TimeDistributionChart';
import { DrillInsightPanel } from '@/components/analytics/DrillInsightPanel';
import { ExportDialog } from '@/components/analytics/ExportDialog';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { useSentimentAnalytics } from '@/hooks/useSentimentAnalytics';
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
  Users,
  Activity,
  Sparkles
} from 'lucide-react';

export default function ReportsAnalyticsPage() {
  const [showExport, setShowExport] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const { stats, isLoading, refresh } = useReportsAnalytics();
  const { stats: sentimentStats, isLoading: sentimentLoading } = useSentimentAnalytics();
  const correlations = useCorrelationAnalytics();
  const drillInsight = useDrillInsight();

  // Marcar como carregado após primeira carga completa
  useMemo(() => {
    if (!isLoading && stats && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [isLoading, stats, initialLoadDone]);

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
          <div className="h-96 w-full bg-muted rounded animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Análise de Relatos</h1>
            <p className="text-muted-foreground">
              Exploração detalhada com filtros e drill-down
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

        {/* Summary KPIs */}
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

        {/* Tabs for detailed analytics */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="flex flex-wrap md:grid md:grid-cols-5 w-full h-auto gap-1 p-1">
            <TabsTrigger value="geral" className="flex-1 min-w-[80px]">Geral</TabsTrigger>
            <TabsTrigger value="sentimento" className="flex-1 min-w-[100px]">Sentimento</TabsTrigger>
            <TabsTrigger value="demografia" className="flex-1 min-w-[100px]">Demografia</TabsTrigger>
            <TabsTrigger value="engajamento" className="flex-1 min-w-[110px]">Engajamento</TabsTrigger>
            <TabsTrigger value="criticidade" className="flex-1 min-w-[100px]">Criticidade</TabsTrigger>
          </TabsList>

          {/* TAB GERAL */}
          <TabsContent value="geral" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RegionalHotspots 
                data={correlations.hotspots || []}
                onRegionClick={(region) => drillInsight.searchByRegion(region)}
              />
              <HotspotsList 
                hotspots={correlations.hotspots || []}
                onHotspotClick={(region) => drillInsight.searchByRegion(region)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TimeDistributionChart
                data={peakHoursData}
                title="Distribuição por Hora"
                type="hour"
                onBarClick={(label) => {
                  const hour = parseInt(label.replace('h', ''), 10);
                  if (!isNaN(hour)) {
                    drillInsight.searchByHour(hour);
                  }
                }}
              />
              <TimeDistributionChart
                data={weekdayData}
                title="Distribuição por Dia"
                type="weekday"
                onBarClick={(label) => drillInsight.searchByWeekday(label)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Top Categorias</h3>
                <div className="h-64 md:h-80">
                  <CategoryBarChart 
                    data={stats.categories}
                    onBarClick={(category) => drillInsight.searchByCategory(category)}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Distribuição Regional</h3>
                <div className="space-y-3">
                  {stats.demographics.byRegion.slice(0, 8).map((region) => (
                    <div 
                      key={region.region} 
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                      onClick={() => drillInsight.searchByRegion(region.region)}
                    >
                      <span className="text-sm font-medium">{region.region}</span>
                      <div className="flex items-center gap-3 flex-1 max-w-md ml-4">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(region.count / stats.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{region.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB SENTIMENTO */}
          <TabsContent value="sentimento" className="space-y-6">
            {sentimentLoading || !sentimentStats ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6 min-h-[320px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Índice de Satisfação</h3>
                    <div className="flex-1 flex items-center justify-center">
                      <SentimentGauge 
                        score={sentimentStats.overallScore} 
                        trend={sentimentStats.trend}
                        onClick={() => drillInsight.searchByOverview()}
                      />
                    </div>
                  </Card>

                  <Card className="p-6 min-h-[320px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Distribuição</h3>
                    <div className="flex-1 relative">
                      <SentimentDonut 
                        data={sentimentStats.distribution}
                        total={stats.total}
                        onSegmentClick={(sentiment) => drillInsight.searchBySentiment(sentiment)}
                      />
                    </div>
                  </Card>

                  <Card className="p-6 min-h-[320px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Palavras-Chave</h3>
                    <div className="flex-1">
                      <WordCloud 
                        words={sentimentStats.keywords} 
                        onWordClick={(word) => drillInsight.searchByKeyword(word)}
                      />
                    </div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Tendência Temporal</h3>
                  <div className="h-64 md:h-80">
                    <SentimentTrend 
                      data={sentimentStats.timeline} 
                      onPointClick={(date) => drillInsight.searchByPeriod(date)}
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">O que está impulsionando o sentimento?</h3>
                  <SentimentDrivers 
                    drivers={sentimentStats.byCategory} 
                    onDriverClick={(category) => drillInsight.searchByCategory(category)}
                  />
                </Card>

                {sentimentStats.insights && sentimentStats.insights.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Insights da IA</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sentimentStats.insights.map((insight) => (
                        <AIInsightsCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* TAB DEMOGRAFIA */}
          <TabsContent value="demografia" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="h-64 md:h-80">
                  <DemographicsPieChart 
                    data={stats.demographics.byGender}
                    title="Por Gênero"
                    onSegmentClick={(gender) => drillInsight.searchByGender(gender)}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <div className="h-64 md:h-80">
                  <DemographicsPieChart 
                    data={stats.demographics.byRace}
                    title="Por Raça"
                    onSegmentClick={(race) => drillInsight.searchByRace(race)}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Pirâmide Etária</h3>
                <div className="h-64 md:h-80">
                  <AgePyramid 
                    data={stats.demographics.byAgeGroup.map(g => ({
                      ageGroup: g.label,
                      count: g.count,
                      percentage: g.percentage
                    }))}
                    onBarClick={(ageGroup) => drillInsight.searchByAge(ageGroup)}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <div className="h-64 md:h-80">
                  <DemographicsPieChart 
                    data={stats.demographics.bySocialClass}
                    title="Por Classe Social"
                    onSegmentClick={(socialClass) => drillInsight.searchBySocialClass(socialClass)}
                  />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB ENGAJAMENTO */}
          <TabsContent value="engajamento" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPICard
                title="Total de Apoios"
                value={stats.engagement.totalLikes}
                trend={{ value: 18, direction: 'up' }}
                icon={TrendingUp}
                onClick={() => drillInsight.searchByEngagement('apoios')}
              />
              <KPICard
                title="Comentários"
                value={stats.engagement.totalComments}
                trend={{ value: 25, direction: 'up' }}
                icon={Activity}
                onClick={() => drillInsight.searchByEngagement('comentários')}
              />
              <KPICard
                title="Média Apoios"
                value={stats.engagement.avgLikesPerReport.toFixed(1)}
                icon={BarChart3}
              />
              <KPICard
                title="Taxa Resolução"
                value={`${((stats.resolved / stats.total) * 100).toFixed(0)}%`}
                trend={{ value: 8, direction: 'up' }}
                icon={Users}
                onClick={() => drillInsight.searchByStatus('resolvido')}
              />
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Funil de Conversão</h3>
              <EngagementFunnel 
                steps={stats.engagement.conversionFunnel}
                onStepClick={(step) => drillInsight.searchByEngagement(step.label)}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 Relatos Mais Apoiados</h3>
              <TopReportsList reports={stats.engagement.topReports} />
            </Card>
          </TabsContent>

          {/* TAB CRITICIDADE */}
          <TabsContent value="criticidade" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Nível de Criticidade</h3>
                <div className="h-64">
                  <CriticalityGauge 
                    score={stats.criticality.criticalScore}
                    onClick={() => drillInsight.searchBySeverity('crítico')}
                  />
                </div>
              </Card>

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
            </div>

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
          </TabsContent>
        </Tabs>

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
}
