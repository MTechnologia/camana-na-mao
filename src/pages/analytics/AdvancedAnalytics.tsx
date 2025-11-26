import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Download } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import FloatingNavbar from '@/components/FloatingNavbar';
import { ChartCard } from '@/components/analytics/ChartCard';
import { FilterBar } from '@/components/analytics/FilterBar';
import { DrillDownDrawer } from '@/components/analytics/DrillDownDrawer';
import { ExportDialog } from '@/components/analytics/ExportDialog';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdvancedAnalytics = () => {
  const navigate = useNavigate();
  const { canAccessAdvancedAnalytics } = useUserRole();
  const [filters, setFilters] = useState({});
  const [selectedDimension, setSelectedDimension] = useState('region');
  const [selectedMetric, setSelectedMetric] = useState('count');
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillPath, setDrillPath] = useState<Array<{ label: string; value: string }>>([]);
  const [showExport, setShowExport] = useState(false);

  if (!canAccessAdvancedAnalytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">
            Você não tem permissão para acessar análises avançadas.
          </p>
          <Button onClick={() => navigate('/analytics')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleDrillDown = (item: any) => {
    setDrillPath([...drillPath, { label: selectedDimension, value: item.name }]);
    setDrillOpen(true);
  };

  const data = [
    { name: 'Centro', value: 856, satisfaction: 78 },
    { name: 'Norte', value: 732, satisfaction: 75 },
    { name: 'Sul', value: 648, satisfaction: 82 },
    { name: 'Leste', value: 592, satisfaction: 74 },
    { name: 'Oeste', value: 521, satisfaction: 80 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Análise Avançada" backTo="/analytics" />

      <div className="pt-[60px] pb-24 max-w-7xl mx-auto px-6 py-6 animate-fade-in">
        {/* Filter Bar */}
        <FilterBar onFilterChange={setFilters} activeFilters={filters} />

        {/* Dimension & Metric Selectors */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Configuração da Análise</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Dimensão Principal</label>
              <Select value={selectedDimension} onValueChange={setSelectedDimension}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="region">Região</SelectItem>
                  <SelectItem value="category">Categoria</SelectItem>
                  <SelectItem value="time">Período</SelectItem>
                  <SelectItem value="service">Tipo de Serviço</SelectItem>
                  <SelectItem value="demographic">Perfil Demográfico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Métrica</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Volume</SelectItem>
                  <SelectItem value="satisfaction">Satisfação Média</SelectItem>
                  <SelectItem value="growth">Taxa de Crescimento</SelectItem>
                  <SelectItem value="severity">Gravidade Média</SelectItem>
                  <SelectItem value="resolution">Tempo de Resolução</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Operação Analítica</label>
              <Select defaultValue="drill-down">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drill-down">Drill Down</SelectItem>
                  <SelectItem value="drill-up">Drill Up</SelectItem>
                  <SelectItem value="drill-across">Drill Across</SelectItem>
                  <SelectItem value="drill-through">Drill Through</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar dimensão secundária
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Comparar séries
            </Button>
          </div>
        </div>

        {/* Main Chart */}
        <ChartCard
          title={`Análise por ${selectedDimension === 'region' ? 'Região' : 'Categoria'}`}
          subtitle="Clique em qualquer barra para explorar em detalhes"
          onExport={() => setShowExport(true)}
          lastUpdated={new Date().toLocaleString('pt-BR')}
          className="mb-6"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} onClick={(e) => e?.activePayload && handleDrillDown(e.activePayload[0].payload)}>
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
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[8, 8, 0, 0]}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronDown className="w-4 h-4" />
            <span>Clique em qualquer elemento para fazer drill down</span>
          </div>
        </ChartCard>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/analytics/dashboards')}>
            Salvar como painel
          </Button>
          <Button onClick={() => setShowExport(true)} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar análise
          </Button>
        </div>

        {/* Drill Path Indicator */}
        {drillPath.length > 0 && (
          <div className="fixed bottom-28 right-6 bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge>Caminho de análise</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {drillPath.map((step, index) => (
                <span key={index}>
                  {index > 0 && <span className="text-muted-foreground mx-1">→</span>}
                  <span className="font-medium">{step.value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <FloatingNavbar />

      {/* Drill Down Drawer */}
      <DrillDownDrawer
        isOpen={drillOpen}
        onClose={() => setDrillOpen(false)}
        breadcrumbs={drillPath}
        onNavigate={(index) => setDrillPath(drillPath.slice(0, index + 1))}
        title="Detalhamento da Análise"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Explorando: {drillPath[drillPath.length - 1]?.value}
          </p>
          
          {/* Mock detailed data */}
          <div className="grid gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-muted rounded-lg p-4 cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => {
                  setDrillPath([...drillPath, { label: 'Bairro', value: `Bairro ${i}` }]);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Subdivisão {i}</span>
                  <Badge variant="secondary">{Math.floor(Math.random() * 100)} relatos</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DrillDownDrawer>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        exportType="advanced-analysis"
        currentFilters={filters}
        estimatedRows={data.reduce((acc, d) => acc + d.value, 0)}
      />
    </div>
  );
};

export default AdvancedAnalytics;
