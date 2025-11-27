import { AdminLayout } from '@/layouts/AdminLayout';
import { KPICard } from '@/components/analytics/KPICard';
import { Users, FileBarChart, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAdminDashboardStats } from '@/hooks/useAdminDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const stats = useAdminDashboardStats();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo à Área Administrativa
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários, visualize analytics e controle painéis públicos.
          </p>
        </div>

        {stats.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total de Usuários"
              value={stats.totalUsers.toLocaleString('pt-BR')}
              icon={Users}
              trend={{ 
                value: Math.abs(stats.usersTrend), 
                direction: stats.usersTrend >= 0 ? 'up' : 'down' 
              }}
              subtitle="últimos 30 dias"
              onClick={() => navigate('/admin/users')}
            />
            <KPICard
              title="Painéis Criados"
              value={stats.totalDashboards.toLocaleString('pt-BR')}
              icon={FileBarChart}
              trend={{ 
                value: Math.abs(stats.dashboardsTrend), 
                direction: stats.dashboardsTrend >= 0 ? 'up' : 'down' 
              }}
              subtitle="este mês"
              onClick={() => navigate('/admin/dashboards')}
            />
            <KPICard
              title="Exportações"
              value={stats.totalExports.toLocaleString('pt-BR')}
              icon={Download}
              trend={{ 
                value: Math.abs(stats.exportsTrend), 
                direction: stats.exportsTrend >= 0 ? 'up' : 'down' 
              }}
              subtitle="última semana"
              onClick={() => navigate('/admin/exports')}
            />
            <KPICard
              title="Acessos"
              value={stats.totalAcessos > 1000 
                ? `${(stats.totalAcessos / 1000).toFixed(1)}k` 
                : stats.totalAcessos.toLocaleString('pt-BR')}
              icon={TrendingUp}
              trend={{ 
                value: Math.abs(stats.acessosTrend), 
                direction: stats.acessosTrend >= 0 ? 'up' : 'down' 
              }}
              subtitle="este mês"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Ações Rápidas
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Usuários
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/admin/analytics')}
              >
                <FileBarChart className="h-4 w-4 mr-2" />
                Ver Analytics
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/admin/dashboards')}
              >
                <FileBarChart className="h-4 w-4 mr-2" />
                Aprovar Painéis
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Atividades Recentes
            </h3>
            {stats.loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
              </div>
            ) : stats.recentActivities.length > 0 ? (
              <div className="space-y-3 text-sm">
                {stats.recentActivities.map((activity) => {
                  const color = 
                    activity.type === 'dashboard' ? 'bg-green-500' :
                    activity.type === 'export' ? 'bg-blue-500' :
                    'bg-yellow-500';
                  
                  return (
                    <div key={activity.id} className="flex items-center gap-3 text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full ${color}`}></div>
                      <span>{activity.message}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
