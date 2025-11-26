import { AdminLayout } from '@/layouts/AdminLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download } from 'lucide-react';

interface ExportLog {
  id: string;
  export_type: string;
  format: string;
  status: string;
  row_count: number | null;
  created_at: string;
  completed_at: string | null;
  profiles?: {
    full_name: string;
  };
}

export default function ExportLogs() {
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
      
      // Fetch profiles separately
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
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Logs de Exportação
          </h1>
          <p className="text-muted-foreground">
            Visualize o histórico de todas as exportações realizadas no sistema.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma exportação registrada</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Concluído em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.profiles?.full_name || 'Usuário desconhecido'}
                    </TableCell>
                    <TableCell className="capitalize">{log.export_type}</TableCell>
                    <TableCell className="uppercase">{log.format}</TableCell>
                    <TableCell>
                      {log.row_count ? log.row_count.toLocaleString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.completed_at
                        ? new Date(log.completed_at).toLocaleString('pt-BR')
                        : '-'}
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
