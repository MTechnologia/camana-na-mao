import { AdminLayout } from '@/layouts/AdminLayout';
import { KPICard } from '@/components/analytics/KPICard';
import { Users, FileBarChart, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total de Usuários"
            value="1,234"
            icon={Users}
            trend={{ value: 12, direction: 'up' }}
            subtitle="últimos 30 dias"
            onClick={() => navigate('/admin/users')}
          />
          <KPICard
            title="Painéis Criados"
            value="45"
            icon={FileBarChart}
            trend={{ value: 5, direction: 'up' }}
            subtitle="este mês"
            onClick={() => navigate('/admin/dashboards')}
          />
          <KPICard
            title="Exportações"
            value="892"
            icon={Download}
            trend={{ value: 8, direction: 'down' }}
            subtitle="última semana"
            onClick={() => navigate('/admin/exports')}
          />
          <KPICard
            title="Acessos"
            value="12.5k"
            icon={TrendingUp}
            trend={{ value: 23, direction: 'up' }}
            subtitle="este mês"
          />
        </div>

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
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Novo painel criado por João Silva</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Exportação concluída</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>Usuário promovido a Gestor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
