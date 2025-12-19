import { useState, useMemo } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KPICard } from '@/components/analytics/KPICard';
import { UnifiedFilterBar, FilterConfig } from '@/components/filters';
import { StatusDonut } from '@/components/analytics/StatusDonut';
import { CategoryBarChart } from '@/components/analytics/CategoryBarChart';
import { DemographicsPieChart } from '@/components/analytics/DemographicsPieChart';
import { AgePyramid } from '@/components/analytics/AgePyramid';
import { EngagementFunnel } from '@/components/analytics/EngagementFunnel';
import { TopReportsList } from '@/components/analytics/TopReportsList';
import { CriticalityGauge } from '@/components/analytics/CriticalityGauge';
import { PatternAlerts } from '@/components/analytics/PatternAlerts';
import { TreeMapChart } from '@/components/analytics/TreeMapChart';
import { ComparisonChart } from '@/components/analytics/ComparisonChart';
import { HeatmapChart } from '@/components/analytics/HeatmapChart';
import { SentimentGauge } from '@/components/analytics/SentimentGauge';
import { SentimentDonut } from '@/components/analytics/SentimentDonut';
import { SentimentTrend } from '@/components/analytics/SentimentTrend';
import { WordCloud } from '@/components/analytics/WordCloud';
import { SentimentDrivers } from '@/components/analytics/SentimentDrivers';
import { AIInsightsCard } from '@/components/analytics/AIInsightsCard';
import { DrillInsightPanel } from '@/components/analytics/DrillInsightPanel';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { useSentimentAnalytics } from '@/hooks/useSentimentAnalytics';
import { useDrillInsight } from '@/hooks/useDrillInsight';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Users, Activity, Sparkles } from 'lucide-react';

interface ReportsFilters {
  search: string;
  category: string;
  status: string;
  dateRange: { from?: Date; to?: Date } | undefined;
}

const filterConfig: FilterConfig<ReportsFilters> = {
  fields: [
    { key: 'search', type: 'search', label: 'Buscar', placeholder: 'Buscar relatos...', colSpan: 2 },
    { 
      key: 'category', 
      type: 'select', 
      label: 'Categoria',
      placeholder: 'Todas',
      options: [
        { value: 'saude', label: 'Saúde' },
        { value: 'educacao', label: 'Educação' },
        { value: 'transporte', label: 'Transporte' },
      ]
    },
    { 
      key: 'status', 
      type: 'select', 
      label: 'Status',
      placeholder: 'Todos',
      options: [
        { value: 'pending', label: 'Pendente' },
        { value: 'in_progress', label: 'Em análise' },
        { value: 'resolved', label: 'Resolvido' },
      ]
    },
    { key: 'dateRange', type: 'daterange', label: 'Período', placeholder: 'Período' },
  ],
  showExport: false,
  compactMode: true,
};

const ReportsAnalytics = () => {
  const [filters, setFilters] = useState<ReportsFilters>({
    search: '',
    category: '',
    status: '',
    dateRange: undefined,
  });

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.dateRange?.from) count++;
    return count;
  }, [filters]);

  const { stats, isLoading, refresh } = useReportsAnalytics(filters);
  const { stats: sentimentStats, isLoading: sentimentLoading } = useSentimentAnalytics(filters);
  const drillInsight = useDrillInsight(filters);

  if (isLoading || !stats) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Análise de Relatos</h1>
          <p className="text-muted-foreground">Dashboard executivo multidimensional</p>
        </div>

        <div className="mb-6">
          <UnifiedFilterBar
            config={filterConfig}
            filters={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClearAll={() => setFilters({ search: '', category: '', status: '', dateRange: undefined })}
            activeCount={activeCount}
          />
        </div>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="flex flex-wrap md:grid md:grid-cols-6 w-full h-auto gap-1 p-1">
            <TabsTrigger value="geral" className="flex-1 min-w-[80px]">Geral</TabsTrigger>
            <TabsTrigger value="sentimento" className="flex-1 min-w-[100px]">Sentimento</TabsTrigger>
            <TabsTrigger value="demografia" className="flex-1 min-w-[100px]">Demografia</TabsTrigger>
            <TabsTrigger value="engajamento" className="flex-1 min-w-[110px]">Engajamento</TabsTrigger>
            <TabsTrigger value="tema" className="flex-1 min-w-[80px]">Tema</TabsTrigger>
            <TabsTrigger value="criticidade" className="flex-1 min-w-[100px]">Criticidade</TabsTrigger>
          </TabsList>

          {/* ABA GERAL */}
          <TabsContent value="geral" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total de Relatos"
                value={stats.total}
                trend={{ value: stats.trend, direction: 'up' }}
                icon={BarChart3}
                onClick={() => drillInsight.searchByOverview()}
              />
              <KPICard
                title="Críticos"
                value={stats.critical}
                icon={TrendingUp}
                onClick={() => drillInsight.searchBySeverity('crítico')}
              />
              <KPICard
                title="Pendentes"
                value={stats.pending}
                icon={Activity}
                onClick={() => drillInsight.searchByStatus('pendente')}
              />
              <KPICard
                title="Resolvidos"
                value={stats.resolved}
                trend={{ value: 15, direction: 'up' }}
                icon={Users}
                onClick={() => drillInsight.searchByStatus('resolvido')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Status dos Relatos</h3>
                <div className="h-64 md:h-80">
                  <StatusDonut 
                    data={stats.byStatus} 
                    total={stats.total}
                    onSegmentClick={(status) => drillInsight.searchByStatus(status)}
                  />
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Top Categorias</h3>
                <div className="h-64 md:h-80">
                  <CategoryBarChart 
                    data={stats.categories}
                    onBarClick={(category) => drillInsight.searchByCategory(category)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Distribuição Regional</h3>
              <div className="space-y-3">
                {stats.demographics.byRegion.map((region) => (
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
            </div>
          </TabsContent>

          {/* ABA SENTIMENTO */}
          <TabsContent value="sentimento" className="space-y-6">
            {sentimentLoading || !sentimentStats ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="bg-card rounded-lg border border-border p-6 min-h-[320px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Índice de Satisfação</h3>
                    <div className="flex-1 flex items-center justify-center">
                      <SentimentGauge 
                        score={sentimentStats.overallScore} 
                        trend={sentimentStats.trend}
                        onClick={() => drillInsight.searchByOverview()}
                      />
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6 min-h-[320px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Distribuição</h3>
                    <div className="flex-1 relative">
                      <SentimentDonut 
                        data={sentimentStats.distribution}
                        total={stats.total}
                        onSegmentClick={(sentiment) => drillInsight.searchBySentiment(sentiment)}
                      />
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6 min-h-[320px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Palavras-Chave</h3>
                    <div className="flex-1">
                      <WordCloud 
                        words={sentimentStats.keywords} 
                        onWordClick={(word) => drillInsight.searchByKeyword(word)}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">Tendência Temporal</h3>
                  <div className="h-64 md:h-80">
                    <SentimentTrend 
                      data={sentimentStats.timeline} 
                      onPointClick={(date) => drillInsight.searchByPeriod(date)}
                    />
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">O que está impulsionando o sentimento?</h3>
                  <SentimentDrivers 
                    drivers={sentimentStats.byCategory} 
                    onDriverClick={(category) => drillInsight.searchByCategory(category)}
                  />
                </div>

                {sentimentStats.insights && sentimentStats.insights.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Insights da IA</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sentimentStats.insights.map((insight) => (
                        <AIInsightsCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ABA DEMOGRAFIA */}
          <TabsContent value="demografia" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="h-64 md:h-80">
                  <DemographicsPieChart 
                    data={stats.demographics.byGender}
                    title="Por Gênero"
                    onSegmentClick={(gender) => drillInsight.searchByGender(gender)}
                  />
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <div className="h-64 md:h-80">
                  <DemographicsPieChart 
                    data={stats.demographics.byRace}
                    title="Por Raça"
                    onSegmentClick={(race) => drillInsight.searchByRace(race)}
                  />
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
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
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <div className="h-64 md:h-80">
                  <DemographicsPieChart 
                    data={stats.demographics.bySocialClass}
                    title="Por Classe Social"
                    onSegmentClick={(socialClass) => drillInsight.searchBySocialClass(socialClass)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA ENGAJAMENTO */}
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

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Funil de Conversão</h3>
              <EngagementFunnel 
                steps={stats.engagement.conversionFunnel}
                onStepClick={(step) => drillInsight.searchByEngagement(step.label)}
              />
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 Relatos Mais Apoiados</h3>
              <TopReportsList reports={stats.engagement.topReports} />
            </div>
          </TabsContent>

          {/* ABA TEMA */}
          <TabsContent value="tema" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Treemap de Categorias</h3>
              <div className="h-96">
                <TreeMapChart 
                  data={stats.categories.map(c => ({ 
                    name: c.category, 
                    size: c.count 
                  }))}
                  onCellClick={(category) => drillInsight.searchByCategory(category)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Urbano vs Transporte</h3>
                <div className="h-64 md:h-80">
                  <ComparisonChart
                    data={[
                      { label: 'Relatos', value1: stats.urban, value2: stats.transport }
                    ]}
                    label1="Urbano"
                    label2="Transporte"
                    onBarClick={(source) => drillInsight.searchBySource(source === 'value1' ? 'urban' : 'transport')}
                  />
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Top Categorias</h3>
                <div className="h-64 md:h-80">
                  <CategoryBarChart 
                    data={stats.categories.slice(0, 5)}
                    onBarClick={(category) => drillInsight.searchByCategory(category)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA CRITICIDADE */}
          <TabsContent value="criticidade" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <CriticalityGauge 
                  score={stats.criticality.criticalScore}
                  onClick={() => drillInsight.searchBySeverity('crítico')}
                />
              </div>

              <div className="md:col-span-2 bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Distribuição por Severidade</h3>
                <div className="h-64 md:h-80">
                  <StatusDonut 
                    data={stats.criticality.bySeverity.map(s => ({
                      status: s.severity,
                      count: s.count,
                      color: s.severity === 'Crítico' ? 'hsl(var(--chart-5))' : 
                             s.severity === 'Alto' ? 'hsl(var(--chart-3))' :
                             s.severity === 'Médio' ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'
                    }))}
                    total={stats.total}
                    onSegmentClick={(severity) => drillInsight.searchBySeverity(severity)}
                  />
                </div>
              </div>
            </div>

            {stats.criticality.patterns.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Padrões de Alerta Detectados</h3>
                <PatternAlerts 
                  alerts={stats.criticality.patterns}
                  onAlertClick={(alert) => drillInsight.searchByKeyword(alert.title)}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Universal Drill Insight Panel */}
        <DrillInsightPanel
          state={drillInsight.state}
          onClose={drillInsight.close}
        />
      </div>
    </AdminLayout>
  );
};

export default ReportsAnalytics;
