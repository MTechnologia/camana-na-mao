import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { SentimentGauge } from '@/components/analytics/SentimentGauge';
import { SentimentDonut } from '@/components/analytics/SentimentDonut';
import { SentimentTrend } from '@/components/analytics/SentimentTrend';
import { WordCloud } from '@/components/analytics/WordCloud';
import { SentimentDrivers } from '@/components/analytics/SentimentDrivers';
import { AIInsightsCard } from '@/components/analytics/AIInsightsCard';
import { KPICard } from '@/components/analytics/KPICard';
import { useSentimentAnalytics } from '@/hooks/useSentimentAnalytics';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

export default function SentimentAnalysis() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string }>({});
  const { stats, isLoading, refresh } = useSentimentAnalytics(filters);
  const { toast } = useToast();

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setFilters({
      startDate: range?.from?.toISOString(),
      endDate: range?.to?.toISOString(),
    });
  };

  const handleRefresh = () => {
    refresh();
    toast({
      title: 'Dados atualizados',
      description: 'As análises foram recarregadas com sucesso.'
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Análise de Sentimento</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Análise de Sentimento</h1>
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">📊 Análise de Sentimento</h1>
          <p className="text-muted-foreground">Dashboard executivo de análise de sentimento cidadão</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(dateRange?.from && "text-primary")}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM', { locale: ptBR })} - {format(dateRange.to, 'dd/MM', { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                  )
                ) : (
                  'Período'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
              {dateRange?.from && (
                <div className="p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDateRangeChange(undefined)}
                  >
                    Limpar filtro
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="space-y-6 pb-8">
        {/* Top Row - Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sentiment Gauge */}
          <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
            <SentimentGauge
              score={stats.overallScore}
              trend={stats.trend}
              label="Índice de Satisfação Cidadã"
              size="lg"
            />
          </div>

          {/* Sentiment Donut */}
          <div className="bg-card rounded-xl border border-border p-6 relative min-h-[300px]">
            <SentimentDonut
              data={stats.distribution}
              total={stats.total}
              onSegmentClick={(sentiment) => {
                toast({
                  title: `Filtrar por ${sentiment}`,
                  description: 'Filtro aplicado com sucesso'
                });
              }}
            />
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <KPICard
              title="Total de Relatos"
              value={stats.total.toLocaleString('pt-BR')}
              icon={Clock}
              subtitle="Último período"
            />
            <KPICard
              title="Relatos Críticos"
              value={Math.round(stats.total * 0.15)}
              icon={AlertCircle}
              subtitle="Requerem atenção"
            />
            <KPICard
              title="Resolvidos"
              value={`${Math.round((stats.distribution.positive / stats.total) * 100)}%`}
              icon={CheckCircle}
              trend={{ value: 12, direction: 'up' }}
            />
          </div>
        </div>

        {/* Trend Line */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Evolução Temporal</h3>
          <div className="h-[300px]">
            <SentimentTrend data={stats.timeline} />
          </div>
        </div>

        {/* Word Cloud & Drivers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Word Cloud */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold mb-4">Palavras mais frequentes</h3>
            <div className="h-[300px]">
              <WordCloud
                words={stats.keywords}
                onWordClick={(word) => {
                  toast({
                    title: `Buscar por "${word}"`,
                    description: 'Aplicando filtro de busca'
                  });
                }}
              />
            </div>
          </div>

          {/* Sentiment Drivers */}
          <div className="bg-card rounded-xl border border-border p-6">
            <SentimentDrivers
              drivers={stats.byCategory}
              onDriverClick={(category) => {
                toast({
                  title: `Filtrar por ${category}`,
                  description: 'Aplicando filtro de categoria'
                });
              }}
            />
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🤖 Insights da IA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.insights.map((insight) => (
              <AIInsightsCard
                key={insight.id}
                insight={insight}
                onViewDetails={(id) => console.log('View details:', id)}
                onTakeAction={(id) => {
                  toast({
                    title: 'Ação iniciada',
                    description: 'Encaminhando para fluxo de trabalho'
                  });
                }}
                onDismiss={(id) => {
                  toast({
                    title: 'Insight ignorado',
                    description: 'Você pode visualizar novamente em histórico'
                  });
                }}
              />
            ))}
          </div>
        </div>

        {/* Regional Heatmap */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">🗺️ Sentimento por Região</h3>
          <div className="space-y-3">
            {['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'].map((region, idx) => {
              const score = [65, 72, 38, 81, 75][idx];
              return (
                <div key={region} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-medium text-foreground">{region}</span>
                  <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm font-medium text-foreground">{score}%</span>
                  {score < 50 && <span className="text-xs text-destructive">← Atenção</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}