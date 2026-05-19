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
import { processWidgetChartData } from '@/lib/widgetChartData';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const DATA_LIMIT = 500;

interface WidgetRendererProps {
  widget: WidgetConfig;
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export const WidgetRenderer = ({ widget }: WidgetRendererProps) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWidgetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: fetchedData, error: queryError } = await supabase
        .from(widget.dataSource)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(DATA_LIMIT);

      if (queryError) throw queryError;

      const processedData = processWidgetChartData(fetchedData ?? [], widget);
      setData(processedData);
    } catch (err) {
      console.error('Error loading widget data:', err);
      const msg = err instanceof Error ? err.message : 'Não foi possível carregar os dados';
      setError(msg);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [widget]);

  useEffect(() => {
    void loadWidgetData();
  }, [loadWidgetData]);

  if (loading) {
    return <Skeleton className="h-full w-full min-h-[200px]" />;
  }

  const emptyMessage = error
    ? `Erro ao carregar: ${error}`
    : 'Sem dados no período ou na fonte selecionada.';

  const renderChart = () => {
    if (data.length === 0 && widget.type !== 'kpi-card') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyChartMessage message={emptyMessage} />
          </CardContent>
        </Card>
      );
    }

    switch (widget.type) {
      case 'kpi-card': {
        const icons = [TrendingUp, Users, AlertTriangle, MapPin];
        const IconComponent = icons[Math.floor(Math.random() * icons.length)];
        return (
          <KPICard
            title={widget.title}
            value={data[0]?.value ?? 0}
            icon={IconComponent}
            subtitle={error ? 'Erro ao carregar' : 'Registros na fonte'}
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
              <HeatmapChart
                data={data as { x: string; y: string; value: number }[]}
                onCellClick={() => {}}
              />
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
