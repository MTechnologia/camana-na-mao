import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UrbanReportFull {
  id: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  severity: string | null;
  status: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  ai_classification: any;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export const useUrbanReportsAdmin = () => {
  const [reports, setReports] = useState<UrbanReportFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // KPIs
  const [kpis, setKpis] = useState({
    total: 0,
    critical: 0,
    pending: 0,
    resolved: 0,
    totalTrend: 0,
    criticalTrend: 0,
    pendingTrend: 0,
    resolvedTrend: 0,
  });

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('urban_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,location_address.ilike.%${searchTerm}%`);
      }
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', toDate.toISOString());
      }

      // Pagination
      const start = page * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data: reportsData, error: reportsError, count } = await query;

      if (reportsError) throw reportsError;

      setTotalCount(count || 0);

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const userIds = [...new Set(reportsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Fetch likes count
      const reportIds = reportsData.map(r => r.id);
      const { data: likesData } = await supabase
        .from('urban_report_likes')
        .select('report_id')
        .in('report_id', reportIds);

      // Fetch comments count
      const { data: commentsData } = await supabase
        .from('urban_report_comments')
        .select('report_id')
        .in('report_id', reportIds);

      // Group counts
      const likesCounts = (likesData || []).reduce((acc, like) => {
        acc[like.report_id] = (acc[like.report_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const commentsCounts = (commentsData || []).reduce((acc, comment) => {
        acc[comment.report_id] = (acc[comment.report_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Combine data
      const enrichedReports: UrbanReportFull[] = reportsData.map(report => ({
        ...report,
        author: profiles?.find(p => p.id === report.user_id) || null,
        likes_count: likesCounts[report.id] || 0,
        comments_count: commentsCounts[report.id] || 0,
      }));

      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Erro ao carregar relatos');
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      // Get current period totals
      const { data: allReports } = await supabase
        .from('urban_reports')
        .select('severity, status, created_at');

      if (!allReports) return;

      const total = allReports.length;
      const critical = allReports.filter(r => r.severity === 'critical').length;
      const pending = allReports.filter(r => r.status === 'pending').length;
      const resolved = allReports.filter(r => r.status === 'resolved').length;

      // Get previous period for trend (last 30 days vs previous 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const recentReports = allReports.filter(r => new Date(r.created_at) >= thirtyDaysAgo);
      const previousReports = allReports.filter(r => {
        const date = new Date(r.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      });

      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setKpis({
        total,
        critical,
        pending,
        resolved,
        totalTrend: calculateTrend(recentReports.length, previousReports.length),
        criticalTrend: calculateTrend(
          recentReports.filter(r => r.severity === 'critical').length,
          previousReports.filter(r => r.severity === 'critical').length
        ),
        pendingTrend: calculateTrend(
          recentReports.filter(r => r.status === 'pending').length,
          previousReports.filter(r => r.status === 'pending').length
        ),
        resolvedTrend: calculateTrend(
          recentReports.filter(r => r.status === 'resolved').length,
          previousReports.filter(r => r.status === 'resolved').length
        ),
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('urban_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Status atualizado com sucesso');
      fetchReports();
      fetchKPIs();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const updateBulkStatus = async (reportIds: string[], newStatus: string) => {
    try {
      const { error } = await supabase
        .from('urban_reports')
        .update({ status: newStatus })
        .in('id', reportIds);

      if (error) throw error;

      toast.success(`${reportIds.length} relato(s) atualizado(s)`);
      fetchReports();
      fetchKPIs();
    } catch (error) {
      console.error('Error updating bulk status:', error);
      toast.error('Erro ao atualizar relatos');
    }
  };

  const exportToCSV = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const csvHeaders = ['ID', 'Categoria', 'Subcategoria', 'Descrição', 'Severidade', 'Status', 'Endereço', 'Autor', 'Data', 'Likes', 'Comentários'];
      const csvRows = reports.map(r => [
        r.id,
        r.category,
        r.subcategory || '',
        r.description || '',
        r.severity || '',
        r.status || '',
        r.location_address || '',
        r.author?.full_name || '',
        new Date(r.created_at).toLocaleString('pt-BR'),
        r.likes_count,
        r.comments_count,
      ]);

      const csv = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatos-urbanos-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      // Log export
      await supabase.from('export_logs').insert({
        user_id: user.id,
        export_type: 'urban_reports',
        format: 'csv',
        row_count: reports.length,
        filters: { status: statusFilter, severity: severityFilter, category: categoryFilter, dateRange } as any,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      toast.success('Dados exportados com sucesso');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('urban-reports-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'urban_reports' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.info('Novo relato recebido!');
            fetchReports();
            fetchKPIs();
          } else if (payload.eventType === 'UPDATE') {
            fetchReports();
            fetchKPIs();
          } else if (payload.eventType === 'DELETE') {
            fetchReports();
            fetchKPIs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, severityFilter, categoryFilter, searchTerm, dateRange]);

  useEffect(() => {
    fetchKPIs();
  }, []);

  return {
    reports,
    loading,
    page,
    pageSize,
    totalCount,
    setPage,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    kpis,
    updateReportStatus,
    updateBulkStatus,
    exportToCSV,
    refetch: fetchReports,
  };
};
