import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Bus, Search, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransportReport {
  id: string;
  report_type: string;
  description: string | null;
  severity: string;
  status: string;
  occurrence_date: string;
  location: string | null;
  line_id: string | null;
  line_code_custom: string | null;
  created_at: string;
  transport_lines?: {
    line_code: string;
    line_name: string;
  };
}

const TransportReportsManagement = () => {
  const [reports, setReports] = useState<TransportReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<TransportReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, severityFilter]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('transport_reports')
        .select(`
          *,
          transport_lines (
            line_code,
            line_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Erro ao carregar relatos');
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.transport_lines?.line_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter((r) => r.severity === severityFilter);
    }

    setFilteredReports(filtered);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('transport_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;
      
      toast.success('Status atualizado com sucesso');
      fetchReports();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'resolved': return 'Resolvido';
      case 'rejected': return 'Rejeitado';
      default: return 'Desconhecido';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Não definida';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Relatos de Transporte</h1>
          <p className="text-muted-foreground">Gerencie relatos do sistema de transporte público</p>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, linha ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Severidades</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Lista de Relatos */}
        <div className="grid gap-4">
          {loading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Carregando relatos...</p>
            </Card>
          ) : filteredReports.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Nenhum relato encontrado</p>
            </Card>
          ) : (
            filteredReports.map((report) => (
              <Card key={report.id} className="p-4 hover:border-primary/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getSeverityColor(report.severity)}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {getSeverityLabel(report.severity)}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        {getStatusLabel(report.status)}
                      </Badge>
                      <Badge variant="outline">{report.report_type}</Badge>
                      {report.transport_lines && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Bus className="h-3 w-3" />
                          {report.transport_lines.line_code} - {report.transport_lines.line_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {report.location && (
                        <span>{report.location}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(report.occurrence_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {report.status === 'pending' && (
                      <Select onValueChange={(value) => updateReportStatus(report.id, value)}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Ações" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="resolved">Resolver</SelectItem>
                          <SelectItem value="rejected">Rejeitar</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default TransportReportsManagement;
