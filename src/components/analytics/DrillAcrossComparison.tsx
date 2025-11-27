import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ComparisonData } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DrillAcrossComparisonProps {
  data: ComparisonData;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#a78bfa',
];

export const DrillAcrossComparison = ({ data }: DrillAcrossComparisonProps) => {
  if (!data.datasets || data.datasets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Nenhum dado de comparação disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for recharts
  const chartData = data.datasets[0].data.map((point, idx) => {
    const dataPoint: any = { name: point.label };
    data.datasets.forEach((dataset, datasetIdx) => {
      dataPoint[dataset.label] = dataset.data[idx]?.value || 0;
    });
    return dataPoint;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação: {data.dimension}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.datasets.map((dataset, idx) => (
              <Bar
                key={dataset.label}
                dataKey={dataset.label}
                fill={COLORS[idx % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.datasets.map((dataset, idx) => {
            const total = dataset.data.reduce((sum, point) => sum + point.value, 0);
            return (
              <div
                key={dataset.label}
                className="p-4 rounded-lg border"
                style={{ borderColor: COLORS[idx % COLORS.length] }}
              >
                <div className="text-sm text-muted-foreground mb-1">
                  {dataset.label}
                </div>
                <div className="text-2xl font-bold">{total}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
