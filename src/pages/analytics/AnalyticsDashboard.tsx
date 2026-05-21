import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  MapPin,
  Download,
  BarChart3,
  Plus,
  ListOrdered,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';

import { KPICard } from '@/components/analytics/KPICard';
import { ChartCard } from '@/components/analytics/ChartCard';
import { UnifiedFilterBar, FilterConfig } from '@/components/filters';
import { HeatmapChart } from '@/components/analytics/HeatmapChart';
import { ExportDialog } from '@/components/analytics/ExportDialog';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalyticsDashboardSummary } from '@/hooks/useAnalyticsDashboardSummary';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'recharts';

function periodLabel(ym: string): string {
  const parts = ym.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function trendFromPct(pct: number | null | undefined): { value: number; direction: 'up' | 'down' } | undefined {
  if (pct == null || Number.isNaN(Number(pct))) return undefined;
  const n = Number(pct);
  return {
    value: Math.min(999, Math.round(Math.abs(n) * 10) / 10),
    direction: n >= 0 ? 'up' : 'down',
  };
}

interface AnalyticsFilters {
  search: string;
  category: string;
  dateRange: { from?: Date; to?: Date } | undefined;
}

const filterConfig: FilterConfig<AnalyticsFilters> = {
  fields: [
    { key: 'search', type: 'search', label: 'Buscar', placeholder: 'Buscar...', colSpan: 2 },
    { 
      key: 'category', 
      type: 'select', 
      label: 'Categoria',
      placeholder: 'Todas',
      options: [
        { value: 'saude', label: 'Saúde' },
        { value: 'educacao', label: 'Educação' },
        { value: 'transporte', label: 'Transporte' },
        { value: 'seguranca', label: 'Segurança' },
      ]
    },
    { key: 'dateRange', type: 'daterange', label: 'Período', placeholder: 'Período' },
  ],
  showExport: false,
};

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { loading: roleLoading, canExportData, canAccessAdvancedAnalytics, canViewDashboards } = useUserRole();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    search: '',
    category: '',
    dateRange: undefined,
  });
  const [showExport, setShowExport] = useState(false);

  const { data: summary, loading: summaryLoading, error: summaryError } = useAnalyticsDashboardSummary({
    from: filters.dateRange?.from,
    to: filters.dateRange?.to,
  });

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.dateRange?.from) count++;
    return count;
  }, [filters]);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[60px] max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!canViewDashboards) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[60px] max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground">
          Dashboards analíticos estão disponíveis para <strong>Admin</strong>, <strong>Gestor</strong>,{' '}
          <strong>Assessor</strong>, <strong>Vereador</strong> e <strong>Cidadão Engajado</strong>.
        </p>
      </div>
    );
  }

  const kpis = summary?.kpis;
  const kpiData = {
    totalReports: kpis?.totalReports.current ?? 0,
    positiveRate: kpis?.positiveRate.current ?? 0,
    criticalIssues: kpis?.criticalIssues.current ?? 0,
    activeRegions: kpis?.activeRegions.current ?? 0,
  };

  const timeSeriesData = (summary?.time_series ?? []).map((t) => ({
    name: periodLabel(t.period),
    reports: t.reports,
    satisfaction: t.satisfaction,
  }));

  const categoryData = summary?.category_distribution ?? [];

  const heatmapRaw = summary?.heatmap ?? [];
  const heatmapData =
    heatmapRaw.length > 0 ? heatmapRaw : [{ x: '—', y: '—', value: 0 }];

  const topRegionsBar = summary?.top_regions ?? [];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const lastUpdatedLabel = summary?.range?.end
    ? new Date(summary.range.end).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Análise de Dados" />

      <div className="pt-[60px] pb-24 max-w-7xl mx-auto px-6 py-6 animate-fade-in">
        {/* Filter Bar */}
        <div className="mb-6">
          <UnifiedFilterBar
            config={filterConfig}
            filters={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClearAll={() => setFilters({ search: '', category: '', dateRange: undefined })}
            activeCount={activeCount}
          />
        </div>

        {summaryError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{summaryError}</AlertDescription>
          </Alert>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/paineis/piores-servicos')}
              className="gap-2"
            >
              <ListOrdered className="w-4 h-4" />
              Piores por dimensão
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/paineis/criar')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Painel
            </Button>
            {canAccessAdvancedAnalytics && (
              <Button
                variant="outline"
                onClick={() => navigate('/paineis/avancado')}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Análise avançada
              </Button>
            )}
            {canExportData && (
              <Button
                onClick={() => setShowExport(true)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar dados
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        {summaryLoading && !summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <KPICard
              title="Total de Relatos"
              value={kpiData.totalReports.toLocaleString('pt-BR')}
              icon={TrendingUp}
              trend={trendFromPct(kpis?.totalReports.trendPct)}
              subtitle="vs. período anterior (mesma duração)"
            />
            <KPICard
              title="Taxa de Satisfação"
              value={`${kpiData.positiveRate}%`}
              icon={Users}
              trend={trendFromPct(kpis?.positiveRate.trendPct)}
              subtitle="Avaliações 4–5 estrelas (publicadas)"
            />
            <KPICard
              title="Questões Críticas"
              value={kpiData.criticalIssues}
              icon={AlertTriangle}
              trend={trendFromPct(
                kpis?.criticalIssues.trendPct != null ? -Number(kpis.criticalIssues.trendPct) : null,
              )}
              subtitle="Relatos urbanos e transporte (alta/crítica)"
            />
            <KPICard
              title="Regiões Ativas"
              value={kpiData.activeRegions}
              icon={MapPin}
              trend={trendFromPct(kpis?.activeRegions.trendPct)}
              subtitle="Bairros distintos (relatos urbanos)"
            />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Time Series Chart */}
          <ChartCard
            title="Evolução Temporal"
            subtitle="Relatos e satisfação ao longo do tempo"
            onDrillDown={() => navigate('/paineis/avancado')}
            lastUpdated={lastUpdatedLabel}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData.length ? timeSeriesData : [{ name: '—', reports: 0, satisfaction: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Relatos"
                />
                <Line
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Satisfação (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Category Distribution */}
          <ChartCard
            title="Distribuição por Categoria"
            subtitle="Volume de demandas por área"
            onDrillDown={() => navigate('/paineis/avancado')}
            lastUpdated={lastUpdatedLabel}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData.length ? categoryData : [{ name: 'Sem dados', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Heatmap */}
        <ChartCard
          title="Mapa de Calor - Demandas por Região e Dia"
          subtitle="Relatos urbanos por faixa heurística de bairro e dia da semana"
          onDrillDown={() => navigate('/paineis/avancado')}
          lastUpdated={lastUpdatedLabel}
          className="mb-6"
        >
          <HeatmapChart
            data={heatmapData}
            onCellClick={() => navigate('/paineis/avancado')}
          />
        </ChartCard>

        {/* Recent Activity */}
        <ChartCard
          title="Atividade por Região"
          subtitle="Top 10 regiões com mais relatos"
          lastUpdated={lastUpdatedLabel}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={
                topRegionsBar.length > 0
                  ? topRegionsBar
                  : [{ name: 'Sem dados', value: 0 }]
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        exportType="dashboard"
        currentFilters={filters}
        estimatedRows={kpiData.totalReports}
      />
    </div>
  );
};

export default AnalyticsDashboard;
