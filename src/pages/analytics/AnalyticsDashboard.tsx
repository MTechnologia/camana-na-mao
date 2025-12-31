import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  MapPin,
  Download,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';

import { KPICard } from '@/components/analytics/KPICard';
import { ChartCard } from '@/components/analytics/ChartCard';
import { UnifiedFilterBar, FilterConfig } from '@/components/filters';
import { HeatmapChart } from '@/components/analytics/HeatmapChart';
import { ExportDialog } from '@/components/analytics/ExportDialog';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { loading: roleLoading, canExportData, canAccessAdvancedAnalytics } = useUserRole();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    search: '',
    category: '',
    dateRange: undefined,
  });
  const [showExport, setShowExport] = useState(false);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.dateRange?.from) count++;
    return count;
  }, [filters]);

  // Mock data
  const kpiData = {
    totalReports: 12847,
    positiveRate: 78,
    criticalIssues: 34,
    activeRegions: 96,
  };

  const timeSeriesData = [
    { name: 'Jan', reports: 1200, satisfaction: 72 },
    { name: 'Fev', reports: 1400, satisfaction: 75 },
    { name: 'Mar', reports: 1100, satisfaction: 78 },
    { name: 'Abr', reports: 1600, satisfaction: 76 },
    { name: 'Mai', reports: 1800, satisfaction: 80 },
    { name: 'Jun', reports: 1500, satisfaction: 82 },
  ];

  const categoryData = [
    { name: 'Saúde', value: 4200 },
    { name: 'Educação', value: 3100 },
    { name: 'Transporte', value: 2800 },
    { name: 'Segurança', value: 1900 },
    { name: 'Outros', value: 847 },
  ];

  const heatmapData = [
    { x: 'Centro', y: 'Seg', value: 45 },
    { x: 'Centro', y: 'Ter', value: 52 },
    { x: 'Centro', y: 'Qua', value: 49 },
    { x: 'Norte', y: 'Seg', value: 32 },
    { x: 'Norte', y: 'Ter', value: 38 },
    { x: 'Norte', y: 'Qua', value: 35 },
    { x: 'Sul', y: 'Seg', value: 28 },
    { x: 'Sul', y: 'Ter', value: 31 },
    { x: 'Sul', y: 'Qua', value: 27 },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Análise de Dados" />
        <div className="pt-[60px] pb-24 max-w-7xl mx-auto px-6 py-6">
          <Skeleton className="h-32 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

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

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
          <div className="flex gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <KPICard
            title="Total de Relatos"
            value={kpiData.totalReports.toLocaleString('pt-BR')}
            icon={TrendingUp}
            trend={{ value: 12.5, direction: 'up' }}
            subtitle="vs. mês anterior"
          />
          <KPICard
            title="Taxa de Satisfação"
            value={`${kpiData.positiveRate}%`}
            icon={Users}
            trend={{ value: 3.2, direction: 'up' }}
            subtitle="Avaliações positivas"
          />
          <KPICard
            title="Questões Críticas"
            value={kpiData.criticalIssues}
            icon={AlertTriangle}
            trend={{ value: 8.1, direction: 'down' }}
            subtitle="Requerem atenção"
          />
          <KPICard
            title="Regiões Ativas"
            value={kpiData.activeRegions}
            icon={MapPin}
            subtitle="Com relatos recentes"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Time Series Chart */}
          <ChartCard
            title="Evolução Temporal"
            subtitle="Relatos e satisfação ao longo do tempo"
            onDrillDown={() => navigate('/paineis/avancado')}
            lastUpdated={new Date().toLocaleString('pt-BR')}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
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
            lastUpdated={new Date().toLocaleString('pt-BR')}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
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
          subtitle="Intensidade de ocorrências ao longo da semana"
          onDrillDown={() => navigate('/paineis/avancado')}
          lastUpdated={new Date().toLocaleString('pt-BR')}
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
          lastUpdated={new Date().toLocaleString('pt-BR')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'Centro', value: 856 },
                { name: 'Zona Norte', value: 732 },
                { name: 'Zona Sul', value: 648 },
                { name: 'Zona Leste', value: 592 },
                { name: 'Zona Oeste', value: 521 },
              ]}
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
