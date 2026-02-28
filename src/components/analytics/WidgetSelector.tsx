import { BarChart3, PieChart, TrendingUp, Activity, Table2, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { WidgetConfig } from './DashboardPreview';

interface WidgetSelectorProps {
  onAddWidget: (widget: WidgetConfig) => void;
}

const widgetTypes = [
  { value: 'kpi-card', label: 'KPI Card', icon: Activity, description: 'Exibe um valor único com ícone' },
  { value: 'bar-chart', label: 'Gráfico de Barras', icon: BarChart3, description: 'Comparação entre categorias' },
  { value: 'pie-chart', label: 'Gráfico de Pizza', icon: PieChart, description: 'Distribuição percentual' },
  { value: 'line-chart', label: 'Gráfico de Linha', icon: TrendingUp, description: 'Evolução temporal' },
  { value: 'heatmap', label: 'Mapa de Calor', icon: Grid3x3, description: 'Intensidade por região/período' },
  { value: 'table', label: 'Tabela', icon: Table2, description: 'Dados tabulares detalhados' },
];

const dataSources = [
  { value: 'urban_reports', label: 'Relatos Urbanos' },
  { value: 'transport_reports', label: 'Relatos de Transporte' },
  { value: 'service_ratings', label: 'Avaliações de Serviços' },
  { value: 'audiencias', label: 'Audiências Públicas' },
];

export const WidgetSelector = ({ onAddWidget }: WidgetSelectorProps) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [widgetTitle, setWidgetTitle] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [dimension, setDimension] = useState('');

  const handleAddWidget = () => {
    if (!selectedType || !widgetTitle || !dataSource) {
      return;
    }

    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: selectedType as 'kpi-card' | 'bar-chart' | 'pie-chart' | 'line-chart' | 'heatmap',
      title: widgetTitle,
      dataSource: dataSource as string,
      dimension: dimension || undefined,
      position: {
        x: 0,
        y: 0,
        w: selectedType === 'kpi-card' ? 3 : 6,
        h: 1,
      },
    };

    onAddWidget(newWidget);
    
    // Reset form
    setWidgetTitle('');
    setDimension('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar Widget</CardTitle>
        <CardDescription>Selecione o tipo de visualização e configure os dados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Widget Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {widgetTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`p-4 border rounded-lg transition-all hover:border-primary ${
                  selectedType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <Icon className="w-6 h-6 mb-2 mx-auto text-primary" />
                <p className="text-xs font-medium text-center">{type.label}</p>
              </button>
            );
          })}
        </div>

        {selectedType && (
          <>
            {/* Widget Title */}
            <div className="space-y-2">
              <Label htmlFor="widget-title">Título do Widget</Label>
              <Input
                id="widget-title"
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="Ex: Relatos por Região"
              />
            </div>

            {/* Data Source */}
            <div className="space-y-2">
              <Label htmlFor="data-source">Fonte de Dados</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger id="data-source">
                  <SelectValue placeholder="Selecione a fonte de dados" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dimension (optional for charts) */}
            {selectedType !== 'kpi-card' && (
              <div className="space-y-2">
                <Label htmlFor="dimension">Dimensão (opcional)</Label>
                <Input
                  id="dimension"
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  placeholder="Ex: category, status, region"
                />
              </div>
            )}

            {/* Add Button */}
            <Button
              onClick={handleAddWidget}
              disabled={!widgetTitle || !dataSource}
              className="w-full"
            >
              Adicionar Widget ao Painel
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
