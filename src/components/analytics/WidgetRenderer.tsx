import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertTriangle, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from './KPICard';
import { HeatmapChart } from './HeatmapChart';
import { Skeleton } from '@/components/ui/skeleton';
import type { WidgetConfig } from './DashboardPreview';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface WidgetRendererProps {
  widget: WidgetConfig;
}

export const WidgetRenderer = ({ widget }: WidgetRendererProps) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWidgetData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch data based on dataSource
      const query = supabase.from(widget.dataSource).select('*');
      
      const { data: fetchedData, error } = await query.limit(10);
      
      if (error) throw error;
      
      // Process data based on widget type
      const processedData = processDataForWidget(fetchedData || [], widget);
      setData(processedData);
    } catch (error) {
      console.error('Error loading widget data:', error);
      // Use mock data on error
      setData(getMockData(widget.type));
    } finally {
      setLoading(false);
    }
  }, [widget]);

  useEffect(() => {
    loadWidgetData();
  }, [loadWidgetData]);

  const processDataForWidget = (rawData: Record<string, unknown>[], widget: WidgetConfig) => {
    switch (widget.type) {
      case 'kpi-card':
        return [{ value: rawData.length, label: widget.title }];
      case 'bar-chart':
      case 'pie-chart':
      case 'line-chart': {
        // Group by dimension and count
        const grouped = rawData.reduce((acc: Record<string, number>, item: Record<string, unknown>) => {
          const key = String(widget.dimension ? item[widget.dimension] ?? 'Total' : 'Total');
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
      }
      default:
        return rawData;
    }
  };

  const getMockData = (type: string) => {
    switch (type) {
      case 'bar-chart':
        return [
          { name: 'Centro', value: 856 },
          { name: 'Norte', value: 732 },
          { name: 'Sul', value: 648 },
          { name: 'Leste', value: 592 },
          { name: 'Oeste', value: 521 },
        ];
      case 'pie-chart':
        return [
          { name: 'Saúde', value: 4200 },
          { name: 'Educação', value: 3100 },
          { name: 'Transporte', value: 2800 },
          { name: 'Segurança', value: 1900 },
        ];
      case 'line-chart':
        return [
          { name: 'Jan', value: 1200 },
          { name: 'Fev', value: 1400 },
          { name: 'Mar', value: 1100 },
          { name: 'Abr', value: 1600 },
          { name: 'Mai', value: 1800 },
        ];
      case 'heatmap':
        return [
          { x: 'Centro', y: 'Seg', value: 45 },
          { x: 'Centro', y: 'Ter', value: 52 },
          { x: 'Norte', y: 'Seg', value: 32 },
          { x: 'Sul', y: 'Seg', value: 28 },
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return <Skeleton className="h-full w-full" />;
  }

  const renderChart = () => {
    switch (widget.type) {
      case 'kpi-card': {
        const icons = [TrendingUp, Users, AlertTriangle, MapPin];
        const IconComponent = icons[Math.floor(Math.random() * icons.length)];
        return (
          <KPICard
            title={widget.title}
            value={data[0]?.value || 0}
            icon={IconComponent}
            subtitle="Dados do painel"
          />
        );
      }

      case 'bar-chart':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
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
            </CardContent>
          </Card>
        );

      case 'pie-chart':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'line-chart':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data}>
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
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'heatmap':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <HeatmapChart data={data} onCellClick={() => {}} />
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tipo de widget não suportado</p>
            </CardContent>
          </Card>
        );
    }
  };

  return renderChart();
};
