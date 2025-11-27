import { AdminLayout } from '@/layouts/AdminLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveTable } from '@/components/admin/ResponsiveTable';

interface Dashboard {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  is_approved: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

export default function DashboardManagement() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const dashboardsWithProfiles = data?.map(dashboard => ({
        ...dashboard,
        profiles: profilesData?.find(p => p.id === dashboard.user_id),
      }));

      setDashboards(dashboardsWithProfiles || []);
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      toast.error('Erro ao carregar painéis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dashboards')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Painel aprovado com sucesso');
      fetchDashboards();
    } catch (error) {
      console.error('Error approving dashboard:', error);
      toast.error('Erro ao aprovar painel');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dashboards')
        .update({ is_approved: false, is_public: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Painel rejeitado');
      fetchDashboards();
    } catch (error) {
      console.error('Error rejecting dashboard:', error);
      toast.error('Erro ao rejeitar painel');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestão de Painéis Públicos</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Aprove ou rejeite painéis criados por usuários para publicação
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Nenhum painel criado ainda</p>
          </div>
        ) : (
          <ResponsiveTable
            data={dashboards}
            keyExtractor={(dashboard) => dashboard.id}
            columns={[
              {
                header: 'Título',
                accessor: (dashboard) => (
                  <div>
                    <p className="font-medium">{dashboard.title}</p>
                    {dashboard.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {dashboard.description}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                header: 'Criador',
                accessor: (dashboard) => dashboard.profiles?.full_name || 'Usuário desconhecido',
                hideOnMobile: true,
              },
              {
                header: 'Data',
                accessor: (dashboard) => new Date(dashboard.created_at).toLocaleDateString('pt-BR'),
                hideOnMobile: true,
              },
              {
                header: 'Status',
                accessor: (dashboard) => (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={dashboard.is_public ? 'default' : 'secondary'} className="text-xs">
                      {dashboard.is_public ? 'Público' : 'Privado'}
                    </Badge>
                    <Badge
                      variant={dashboard.is_approved ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {dashboard.is_approved ? 'Aprovado' : 'Pendente'}
                    </Badge>
                  </div>
                ),
              },
              {
                header: 'Ações',
                accessor: (dashboard) => (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!dashboard.is_approved && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(dashboard.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(dashboard.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
            renderMobileCard={(dashboard) => (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{dashboard.title}</p>
                  {dashboard.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {dashboard.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{dashboard.profiles?.full_name || 'Usuário desconhecido'}</span>
                  <span>{new Date(dashboard.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={dashboard.is_public ? 'default' : 'secondary'}>
                    {dashboard.is_public ? 'Público' : 'Privado'}
                  </Badge>
                  <Badge variant={dashboard.is_approved ? 'default' : 'outline'}>
                    {dashboard.is_approved ? 'Aprovado' : 'Pendente'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  {!dashboard.is_approved && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(dashboard.id)}
                        className="text-green-600"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(dashboard.id)}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </AdminLayout>
  );
}
