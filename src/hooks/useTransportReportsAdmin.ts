import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransportReportFull {
  id: string;
  report_type: string;
  description: string | null;
  severity: string;
  status: string;
  occurrence_date: string;
  occurrence_time: string | null;
  location: string | null;
  line_id: string | null;
  line_code_custom: string | null;
  ai_sentiment: string | null;
  ai_category: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  responded_at: string | null;
  first_response_time: string | null;
  transport_lines: {
    line_code: string;
    line_name: string;
    line_type: string;
  } | null;
  author: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

interface KPIs {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  responded: number;
  notResponded: number;
  responseRate: number;
  totalTrend: number;
  pendingTrend: number;
}

export const useTransportReportsAdmin = () => {
  const [reports, setReports] = useState<TransportReportFull[]>([]);
  const [filteredReports, setFilteredReports] = useState<TransportReportFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [kpis, setKpis] = useState<KPIs>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    responded: 0,
    notResponded: 0,
    responseRate: 0,
    totalTrend: 0,
    pendingTrend: 0,
  });
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [responseFilter, setResponseFilter] = useState<string>('all');

  const ITEMS_PER_PAGE = 20;

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Buscar relatórios com joins
      let query = supabase
        .from('transport_reports')
        .select(`
          *,
          transport_lines (
            line_code,
            line_name,
            line_type
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Buscar informações dos autores separadamente
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const reportsWithAuthors: TransportReportFull[] = (data || []).map(report => ({
        ...report,
        responded_at: report.responded_at as string | null,
        first_response_time: report.first_response_time as string | null,
        author: profilesMap.get(report.user_id) || null,
      }));

      setReports(reportsWithAuthors);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching transport reports:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const { count: total } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true });

      const { count: pending } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: inProgress } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const { count: resolved } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      const { count: rejected } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');

      // KPIs de resposta
      const { count: responded } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .not('responded_at', 'is', null);

      const { count: notResponded } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .is('responded_at', null);

      const responseRate = total && total > 0 
        ? Math.round(((responded || 0) / total) * 100) 
        : 0;

      // Tendências (últimos 7 dias vs 7 dias anteriores)
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(today.getDate() - 14);

      const { count: recentTotal } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: previousTotal } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString());

      const totalTrend = previousTotal
        ? Math.round(((recentTotal || 0) - previousTotal) / previousTotal * 100)
        : 0;

      setKpis({
        total: total || 0,
        pending: pending || 0,
        inProgress: inProgress || 0,
        resolved: resolved || 0,
        rejected: rejected || 0,
        responded: responded || 0,
        notResponded: notResponded || 0,
        responseRate,
        totalTrend,
        pendingTrend: pending || 0 > 0 ? 15 : -5,
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Busca por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.description?.toLowerCase().includes(term) ||
          report.location?.toLowerCase().includes(term) ||
          report.transport_lines?.line_name?.toLowerCase().includes(term) ||
          report.transport_lines?.line_code?.toLowerCase().includes(term) ||
          report.author?.full_name?.toLowerCase().includes(term)
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    // Filtro de severidade
    if (severityFilter !== 'all') {
      filtered = filtered.filter((report) => report.severity === severityFilter);
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter((report) => report.report_type === typeFilter);
    }

    // Filtro de data
    if (dateRange.start) {
      filtered = filtered.filter(
        (report) => new Date(report.created_at) >= new Date(dateRange.start!)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(
        (report) => new Date(report.created_at) <= new Date(dateRange.end!)
      );
    }

    // Filtro de resposta
    if (responseFilter === 'responded') {
      filtered = filtered.filter((report) => report.responded_at !== null);
    } else if (responseFilter === 'not_responded') {
      filtered = filtered.filter((report) => report.responded_at === null);
    }

    setFilteredReports(filtered);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
    setPage(1);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('transport_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Status atualizado com sucesso');
      await fetchReports();
      await fetchKPIs();
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const updateBulkStatus = async (reportIds: string[], newStatus: string) => {
    try {
      const { error } = await supabase
        .from('transport_reports')
        .update({ status: newStatus })
        .in('id', reportIds);

      if (error) throw error;

      toast.success(`${reportIds.length} relatórios atualizados`);
      await fetchReports();
      await fetchKPIs();
    } catch (error) {
      console.error('Error updating bulk status:', error);
      toast.error('Erro ao atualizar relatórios');
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      // Deletar referrals associados primeiro
      await supabase
        .from('report_referrals')
        .delete()
        .eq('report_id', reportId);

      // Deletar o relatório
      const { error } = await supabase
        .from('transport_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Relatório excluído com sucesso');
      await fetchReports();
      await fetchKPIs();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Erro ao excluir relatório');
    }
  };

  const deleteBulkReports = async (reportIds: string[]) => {
    try {
      // Deletar referrals associados
      await supabase
        .from('report_referrals')
        .delete()
        .in('report_id', reportIds);

      // Deletar os relatórios
      const { error } = await supabase
        .from('transport_reports')
        .delete()
        .in('id', reportIds);

      if (error) throw error;

      toast.success(`${reportIds.length} relatórios excluídos`);
      await fetchReports();
      await fetchKPIs();
    } catch (error) {
      console.error('Error deleting bulk reports:', error);
      toast.error('Erro ao excluir relatórios');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Tipo',
      'Descrição',
      'Severidade',
      'Status',
      'Data',
      'Hora',
      'Localização',
      'Linha',
      'Autor',
      'Criado em',
    ];

    const rows = filteredReports.map((report) => [
      report.id,
      report.report_type,
      report.description || '',
      report.severity,
      report.status,
      report.occurrence_date,
      report.occurrence_time || '',
      report.location || '',
      report.transport_lines?.line_name || report.line_code_custom || '',
      report.author?.full_name || '',
      new Date(report.created_at).toLocaleString('pt-BR'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorios-transporte-${new Date().toISOString()}.csv`;
    link.click();

    toast.success('Exportação concluída');
  };

  useEffect(() => {
    fetchReports();
    fetchKPIs();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, severityFilter, typeFilter, dateRange, responseFilter]);

  useEffect(() => {
    // Subscribe para atualizações em tempo real
    const channel = supabase
      .channel('transport_reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transport_reports' },
        () => {
          fetchReports();
          fetchKPIs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const paginatedReports = filteredReports.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return {
    reports: paginatedReports,
    loading,
    kpis,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    typeFilter,
    setTypeFilter,
    responseFilter,
    setResponseFilter,
    dateRange,
    setDateRange,
    page,
    setPage,
    totalPages,
    updateReportStatus,
    updateBulkStatus,
    deleteReport,
    deleteBulkReports,
    exportToCSV,
    refetch: fetchReports,
  };
};
