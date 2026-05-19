import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { ResponsiveTable } from '@/components/admin/ResponsiveTable';

interface ExportLog {
  id: string;
  export_type: string;
  format: string;
  status: string;
  row_count: number | null;
  created_at: string;
  completed_at: string | null;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

export default function ExportLogs({ embedded }: { embedded?: boolean } = {}) {
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('export_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const userIds = [...new Set(data?.map(l => l.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const logsWithProfiles = data?.map(log => ({
        ...log,
        profiles: profilesData?.find(p => p.id === log.user_id),
      }));

      setLogs(logsWithProfiles || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500">Concluído</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500">Pendente</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminPageShell embedded={embedded}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Logs de Exportação</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Histórico de todas as exportações realizadas no sistema
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma exportação realizada ainda</p>
          </div>
        ) : (
          <ResponsiveTable
            data={logs}
            keyExtractor={(log) => log.id}
            columns={[
              {
                header: 'Tipo',
                accessor: (log) => (
                  <span className="capitalize font-medium">{log.export_type.replace('_', ' ')}</span>
                ),
              },
              {
                header: 'Formato',
                accessor: (log) => (
                  <Badge variant="outline" className="text-xs">{log.format.toUpperCase()}</Badge>
                ),
                hideOnMobile: true,
              },
              {
                header: 'Status',
                accessor: (log) => getStatusBadge(log.status),
              },
              {
                header: 'Registros',
                accessor: (log) => log.row_count ? log.row_count.toLocaleString('pt-BR') : '-',
                hideOnMobile: true,
              },
              {
                header: 'Usuário',
                accessor: (log) => log.profiles?.full_name || 'Desconhecido',
                hideOnMobile: true,
              },
              {
                header: 'Criado em',
                accessor: (log) => new Date(log.created_at).toLocaleDateString('pt-BR'),
              },
              {
                header: 'Completado em',
                accessor: (log) => log.completed_at 
                  ? new Date(log.completed_at).toLocaleDateString('pt-BR')
                  : '-',
                hideOnMobile: true,
              },
            ]}
            renderMobileCard={(log) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{log.export_type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{log.profiles?.full_name || 'Desconhecido'}</p>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">{log.format.toUpperCase()}</Badge>
                  {log.row_count && (
                    <span className="text-muted-foreground">
                      {log.row_count.toLocaleString('pt-BR')} registros
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                  {log.completed_at && (
                    <span>Concluído: {new Date(log.completed_at).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </AdminPageShell>
  );
}
