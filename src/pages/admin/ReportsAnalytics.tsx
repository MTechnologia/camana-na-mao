import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, Users, Activity, Tag, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ReportsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    pending: 0,
    resolved: 0,
    bySentiment: { negative: 0, neutral: 0, positive: 0 },
    byCategory: [] as Array<{ category: string; count: number }>,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all urban reports
      const { data: urbanReports, error: urbanError } = await supabase
        .from('urban_reports')
        .select('*');

      if (urbanError) throw urbanError;

      // Fetch all transport reports
      const { data: transportReports, error: transportError } = await supabase
        .from('transport_reports')
        .select('*');

      if (transportError) throw transportError;

      const allReports = [...(urbanReports || []), ...(transportReports || [])];

      // Calculate stats
      const total = allReports.length;
      const critical = allReports.filter(r => r.severity === 'critical').length;
      const pending = allReports.filter(r => r.status === 'pending').length;
      const resolved = allReports.filter(r => r.status === 'resolved').length;

      // Sentiment analysis (urban reports only)
      const negative = urbanReports?.filter(r => {
        const sentiment = r.ai_classification as any;
        return sentiment?.sentiment === 'negative';
      }).length || 0;
      const neutral = urbanReports?.filter(r => {
        const sentiment = r.ai_classification as any;
        return sentiment?.sentiment === 'neutral';
      }).length || 0;
      const positive = urbanReports?.filter(r => {
        const sentiment = r.ai_classification as any;
        return sentiment?.sentiment === 'positive';
      }).length || 0;

      // Category breakdown
      const categoryMap = new Map<string, number>();
      allReports.forEach(r => {
        let category = 'Sem categoria';
        if ('category' in r && r.category) {
          category = r.category;
        } else if ('report_type' in r && r.report_type) {
          category = r.report_type;
        }
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      const byCategory = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Severity breakdown
      const criticalCount = allReports.filter(r => r.severity === 'critical').length;
      const highCount = allReports.filter(r => r.severity === 'high').length;
      const mediumCount = allReports.filter(r => r.severity === 'medium').length;
      const lowCount = allReports.filter(r => r.severity === 'low').length;

      setStats({
        total,
        critical,
        pending,
        resolved,
        bySentiment: { negative, neutral, positive },
        byCategory,
        bySeverity: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const KPICard = ({ icon: Icon, title, value, color }: any) => (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Análise de Relatos</h1>
          <p className="text-muted-foreground">Dashboard analítico multidimensional</p>
        </div>

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="sentimento">Sentimento</TabsTrigger>
            <TabsTrigger value="demografia">Demografia</TabsTrigger>
            <TabsTrigger value="engajamento">Engajamento</TabsTrigger>
            <TabsTrigger value="tema">Tema</TabsTrigger>
            <TabsTrigger value="criticidade">Criticidade</TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                icon={BarChart3}
                title="Total de Relatos"
                value={stats.total}
                color="bg-primary/10 text-primary"
              />
              <KPICard
                icon={AlertTriangle}
                title="Relatos Críticos"
                value={stats.critical}
                color="bg-red-500/10 text-red-600"
              />
              <KPICard
                icon={TrendingUp}
                title="Pendentes"
                value={stats.pending}
                color="bg-yellow-500/10 text-yellow-600"
              />
              <KPICard
                icon={Activity}
                title="Resolvidos"
                value={stats.resolved}
                color="bg-green-500/10 text-green-600"
              />
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Categoria</h3>
              <div className="space-y-3">
                {stats.byCategory.slice(0, 10).map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.category}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Aba Sentimento */}
          <TabsContent value="sentimento" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Análise de Sentimento</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">😠 Negativo</span>
                    <span className="text-sm font-semibold">
                      {stats.total > 0 ? Math.round((stats.bySentiment.negative / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.bySentiment.negative / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">😐 Neutro</span>
                    <span className="text-sm font-semibold">
                      {stats.total > 0 ? Math.round((stats.bySentiment.neutral / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.bySentiment.neutral / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">😊 Positivo</span>
                    <span className="text-sm font-semibold">
                      {stats.total > 0 ? Math.round((stats.bySentiment.positive / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.bySentiment.positive / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Aba Demografia */}
          <TabsContent value="demografia">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Análise Demográfica</h3>
              <p className="text-muted-foreground">
                Análise demográfica detalhada em desenvolvimento. Em breve você poderá visualizar
                distribuição de relatos por gênero, raça, região e faixa etária.
              </p>
            </Card>
          </TabsContent>

          {/* Aba Engajamento */}
          <TabsContent value="engajamento">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Análise de Engajamento</h3>
              <p className="text-muted-foreground">
                Métricas de engajamento em desenvolvimento. Em breve você poderá visualizar
                relatos com mais comentários, apoios, taxa de resolução e tempo médio de resposta.
              </p>
            </Card>
          </TabsContent>

          {/* Aba Tema */}
          <TabsContent value="tema" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top Categorias</h3>
              <div className="space-y-3">
                {stats.byCategory.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.category}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Aba Criticidade */}
          <TabsContent value="criticidade" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Severidade</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Crítica
                    </span>
                    <span className="text-sm font-semibold">{stats.bySeverity.critical}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.bySeverity.critical / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Alta
                    </span>
                    <span className="text-sm font-semibold">{stats.bySeverity.high}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.bySeverity.high / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Média
                    </span>
                    <span className="text-sm font-semibold">{stats.bySeverity.medium}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.bySeverity.medium / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-green-600" />
                      Baixa
                    </span>
                    <span className="text-sm font-semibold">{stats.bySeverity.low}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.bySeverity.low / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default ReportsAnalytics;
