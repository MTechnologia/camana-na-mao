import { AdminLayout } from '@/layouts/AdminLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      
      // Fetch profiles separately
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Gestão de Painéis Públicos
          </h1>
          <p className="text-muted-foreground">
            Aprove ou rejeite painéis criados por usuários para publicação.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando painéis...</p>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">Nenhum painel criado ainda</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboards.map((dashboard) => (
                  <TableRow key={dashboard.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dashboard.title}</p>
                        {dashboard.description && (
                          <p className="text-sm text-muted-foreground">
                            {dashboard.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dashboard.profiles?.full_name || 'Usuário desconhecido'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(dashboard.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {dashboard.is_public && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                            Público
                          </Badge>
                        )}
                        {dashboard.is_approved ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">
                            Aprovado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
