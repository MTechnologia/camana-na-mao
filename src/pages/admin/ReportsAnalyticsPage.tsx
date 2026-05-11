import { useState, useMemo, useEffect } from 'react';
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
import { DemographicFilters, DemographicFilterState } from '@/components/analytics/DemographicFilters';
import { VolumeOverviewTab } from '@/components/analytics/VolumeOverviewTab';
import { ResponseTimeOverviewTab } from '@/components/analytics/ResponseTimeOverviewTab';
import { DiagnosticoTab } from '@/components/analytics/DiagnosticoTab';
import { AudienciasAnalyticsTab } from '@/components/analytics/AudienciasAnalyticsTab';
import { TerritorialDrillTab } from '@/components/analytics/TerritorialDrillTab';
import { MultiDrillTab } from '@/components/analytics/MultiDrillTab';
import { CrossAnalyticsTab } from '@/components/analytics/CrossAnalyticsTab';
import { useReportsAnalytics, ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import { useUrlSyncedState, optionalStringSerializer, stringSerializer } from '@/hooks/useUrlSyncedState';
import { usePatternThresholdEvents } from '@/hooks/usePatternThresholdEvents';
import { useSentimentAnalytics } from '@/hooks/useSentimentAnalytics';
import { useCorrelationAnalytics } from '@/hooks/useCorrelationAnalytics';
import { useDrillInsight } from '@/hooks/useDrillInsight';
import { ThemeSwitcher } from '@/components/admin/ThemeSwitcher';
import { useWidgetTheme } from '@/hooks/useWidgetTheme';
import { getTheme, type AnalyticsTabId } from '@/lib/widgetThemes';
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

// HU-6.1 — Labels e min-widths das tabs em um mapa, para iterar dinamicamente
// quando reordenarmos por tema.
const TAB_LABELS: Record<AnalyticsTabId, string> = {
  volume: 'Volume',
  eficiencia: 'Eficiência',
  diagnostico: 'Diagnóstico',
  audiencias: 'Audiências',
  territorial: 'Territorial',
  drill: 'Drill-down',
  cross: 'Cruzamentos',
  geral: 'Geral',
  sentimento: 'Sentimento',
  demografia: 'Demografia',
  engajamento: 'Engajamento',
  criticidade: 'Criticidade',
};

const TAB_MIN_WIDTH: Record<AnalyticsTabId, string> = {
  volume: 'min-w-[80px]',
  eficiencia: 'min-w-[100px]',
  diagnostico: 'min-w-[100px]',
  audiencias: 'min-w-[100px]',
  territorial: 'min-w-[100px]',
  drill: 'min-w-[100px]',
  cross: 'min-w-[110px]',
  geral: 'min-w-[80px]',
  sentimento: 'min-w-[100px]',
  demografia: 'min-w-[100px]',
  engajamento: 'min-w-[110px]',
  criticidade: 'min-w-[100px]',
};

// Analytics page for unified reports visualization
export default function ReportsAnalyticsPage() {
  const [showExport, setShowExport] = useState(false);

  // HU-3.3 — Aba ativa sincronizada com URL (?tab=)
  const [tabState, setTabState] = useUrlSyncedState<{ tab: string }>({
    defaults: { tab: 'volume' },
    serializers: { tab: stringSerializer('volume') },
  });

  // HU-3.3 — Filtros demográficos sincronizados com URL (?dem.g, ?dem.r, ?dem.c, ?dem.a)
  const [demUrlState, setDemUrlState] = useUrlSyncedState<{
    g: string | null;
    r: string | null;
    c: string | null;
    a: string | null;
  }>({
    prefix: 'dem',
    defaults: { g: null, r: null, c: null, a: null },
    serializers: {
      g: optionalStringSerializer(),
      r: optionalStringSerializer(),
      c: optionalStringSerializer(),
      a: optionalStringSerializer(),
    },
  });
  const demographicFilters: DemographicFilterState = useMemo(() => ({
    gender: demUrlState.g ?? undefined,
    race: demUrlState.r ?? undefined,
    socialClass: demUrlState.c ?? undefined,
    ageGroup: demUrlState.a ?? undefined,
  }), [demUrlState]);
  const setDemographicFilters = (
    next: DemographicFilterState | ((prev: DemographicFilterState) => DemographicFilterState),
  ) => {
    const value = typeof next === 'function' ? next(demographicFilters) : next;
    setDemUrlState({
      g: value.gender ?? null,
      r: value.race ?? null,
      c: value.socialClass ?? null,
      a: value.ageGroup ?? null,
    });
  };
  
  // Combine filters for the analytics hook
  const combinedFilters: ReportsAnalyticsFilters = useMemo(() => ({
    ...demographicFilters,
  }), [demographicFilters]);
  
  const { stats, isLoading, error, refresh } = useReportsAnalytics(combinedFilters);
  const {
    alerts: thresholdAlerts,
    error: thresholdAlertsError,
    refresh: refreshThresholdAlerts,
  } = usePatternThresholdEvents();
  const { stats: sentimentStats, isLoading: sentimentLoading } = useSentimentAnalytics();
  const correlations = useCorrelationAnalytics();
  const drillInsight = useDrillInsight(combinedFilters);

  // HU-6.1 — Aplica tema de atuação: reordena as tabs colocando as `priorityTabs`
  // do tema selecionado primeiro e destaca-as visualmente.
  const { theme: themeId } = useWidgetTheme();
  const activeTheme = useMemo(() => getTheme(themeId), [themeId]);
  const orderedTabs: AnalyticsTabId[] = useMemo(() => {
    const all: AnalyticsTabId[] = [
      'volume', 'eficiencia', 'diagnostico', 'audiencias', 'territorial', 'drill',
      'cross', 'geral', 'sentimento', 'demografia', 'engajamento', 'criticidade',
    ];
    if (activeTheme.id === 'geral') return all;
    const seen = new Set<AnalyticsTabId>();
    const ordered: AnalyticsTabId[] = [];
    for (const t of activeTheme.priorityTabs) {
      if (!seen.has(t) && all.includes(t)) {
        ordered.push(t);
        seen.add(t);
      }
    }
    for (const t of all) {
      if (!seen.has(t)) ordered.push(t);
    }
    return ordered;
  }, [activeTheme]);
  const priorityTabSet = useMemo(
    () => new Set(activeTheme.priorityTabs),
    [activeTheme],
  );
  const refreshAll = () => {
    void refresh();
    void refreshThresholdAlerts();
  };

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

  // Mostrar skeleton apenas no primeiro carregamento
  if (isLoading && !stats) {
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

  // Mostrar erro com opção de retry
  if (error && !stats) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-destructive opacity-60" />
          <h2 className="text-xl font-semibold text-foreground">Falha ao carregar análises</h2>
          <p className="text-muted-foreground text-center max-w-md">{error}</p>
          <Button onClick={refreshAll} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Fallback seguro se stats ainda for null
  if (!stats) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <BarChart3 className="h-16 w-16 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Nenhum dado disponível</p>
          <Button onClick={refreshAll} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
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
              Volume, sentimento, demografia e criticidade — relatos urbanos, de transporte e
              avaliações de serviço
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* HU-6.1 — Dropdown de tema de atuação. Persiste por usuário e
                reordena/destaca as tabs e filtros de cada hook. */}
            <ThemeSwitcher />
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Error Banner (when error but stats exist) */}
        {error && stats && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={refreshAll}>
                Tentar novamente
              </Button>
            </div>
          </Card>
        )}

        {/* Demographic Filters */}
        <Card className="p-4">
          <DemographicFilters
            filters={demographicFilters}
            onChange={setDemographicFilters}
            loading={isLoading}
          />
        </Card>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total de Relatos"
            subtitle="Urbano + Transporte"
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
            trend={{ value: Math.abs(stats.resolvedTrend), direction: stats.resolvedTrend >= 0 ? 'up' : 'down' }}
            icon={CheckCircle2}
            className="border-green-500/30"
            onClick={() => drillInsight.searchByStatus('resolvido')}
          />
        </div>

        {/* Tabs for detailed analytics */}
        <Tabs value={tabState.tab} onValueChange={(t) => setTabState({ tab: t })} className="w-full">
          {/* Tabs em flex-wrap puro (mobile-first): quebra naturalmente em 2 linhas sem grid rígido. */}
          <TabsList className="flex flex-wrap w-full h-auto gap-1 p-1">
            {/* HU-6.1 — Tabs reordenadas pelas priorityTabs do tema ativo.
                Tabs do tema ganham um indicador discreto à esquerda (bullet
                colorido) + leve realce de fundo. Sem ring/borda forte para
                não competir com o estado de tab ativa do shadcn. */}
            {orderedTabs.map((id) => {
              const isPriority = activeTheme.id !== 'geral' && priorityTabSet.has(id);
              return (
                <TabsTrigger
                  key={id}
                  value={id}
                  className={`flex-1 ${TAB_MIN_WIDTH[id] ?? 'min-w-[100px]'} ${
                    isPriority
                      ? 'font-semibold bg-primary/[0.04] data-[state=active]:bg-background'
                      : 'text-muted-foreground/80'
                  }`}
                >
                  {isPriority && (
                    <span
                      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary/70"
                      aria-hidden="true"
                    />
                  )}
                  {TAB_LABELS[id]}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* TAB VOLUME — HU-1.1: visão de volume por período / categoria / região */}
          <TabsContent value="volume" className="space-y-6">
            <VolumeOverviewTab />
          </TabsContent>

          {/* TAB EFICIÊNCIA — HU-1.2: tempo médio de resolução e tendência */}
          <TabsContent value="eficiencia" className="space-y-6">
            <ResponseTimeOverviewTab />
          </TabsContent>

          {/* TAB DIAGNÓSTICO — HU-1.3: sentimento + padrões + criticidade */}
          <TabsContent value="diagnostico" className="space-y-6">
            <DiagnosticoTab />
          </TabsContent>

          {/* TAB AUDIÊNCIAS — HU-1.4: engajamento em audiências */}
          <TabsContent value="audiencias" className="space-y-6">
            <AudienciasAnalyticsTab />
          </TabsContent>

          {/* TAB TERRITORIAL — HU-3.1: drill-down zona › bairro › rua */}
          <TabsContent value="territorial" className="space-y-6">
            <TerritorialDrillTab />
          </TabsContent>

          {/* TAB DRILL-DOWN — HU-3.2: drill multi-dimensional (categoria/tempo/status/audiência) */}
          <TabsContent value="drill" className="space-y-6">
            <MultiDrillTab />
          </TabsContent>

          {/* TAB CRUZAMENTOS — HU-3.4: drill-across categoria × demografia */}
          <TabsContent value="cross" className="space-y-6">
            <CrossAnalyticsTab />
          </TabsContent>

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
                trend={{ value: Math.abs(stats.engagement.likesTrend), direction: stats.engagement.likesTrend >= 0 ? 'up' : 'down' }}
                icon={TrendingUp}
                onClick={() => drillInsight.searchByEngagement('apoios')}
              />
              <KPICard
                title="Comentários"
                value={stats.engagement.totalComments}
                trend={{ value: Math.abs(stats.engagement.commentsTrend), direction: stats.engagement.commentsTrend >= 0 ? 'up' : 'down' }}
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
                trend={{ value: Math.abs(stats.resolvedTrend), direction: stats.resolvedTrend >= 0 ? 'up' : 'down' }}
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
              {thresholdAlertsError && (
                <p className="mb-4 text-sm text-muted-foreground">
                  Não foi possível carregar os alertas derivados do pipeline neste momento.
                </p>
              )}
              {thresholdAlerts.length === 0 && !thresholdAlertsError ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum alerta de threshold gerado para a janela atual.
                </p>
              ) : (
                <PatternAlerts
                  alerts={thresholdAlerts}
                  onAlertClick={(alert) => drillInsight.searchByCategory(alert.title || '')}
                />
              )}
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
          estimatedRows={stats.total}
          analyticsStats={stats}
          sentimentStats={sentimentStats}
        />
      </div>
    </AdminLayout>
  );
}
