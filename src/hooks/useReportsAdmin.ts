import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReportType = 'urban' | 'transport';

export interface UnifiedReport {
  id: string;
  type: ReportType;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  location: string | null;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  // Urban-specific fields
  urban_data?: {
    category: string;
    subcategory: string | null;
    photos: string[] | null;
    latitude: number | null;
    longitude: number | null;
    likes_count: number;
    comments_count: number;
    ai_classification: Record<string, unknown> | null;
  };
  // Transport-specific fields
  transport_data?: {
    report_type: string;
    line_id: string | null;
    line_code_custom: string | null;
    occurrence_date: string;
    occurrence_time: string | null;
    impact_description: string | null;
    ai_sentiment: string | null;
    ai_category: string | null;
    ai_pattern_detected: boolean | null;
    responded_at: string | null;
  };
  // N8N fields (common)
  n8n_processed: boolean | null;
  n8n_priority: string | null;
  n8n_tags: string[] | null;
  n8n_validated_category: string | null;
  n8n_enriched_data: Record<string, unknown> | null;
}

export interface ReportsKPIs {
  total: number;
  pending: number;
  in_analysis: number;
  resolved: number;
  urban_count: number;
  transport_count: number;
  critical_count: number;
  trends: {
    total: number;
    pending: number;
  };
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface UseReportsAdminReturn {
  reports: UnifiedReport[];
  loading: boolean;
  kpis: ReportsKPIs;
  kpisLoading: boolean;
  // Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  severityFilter: string;
  setSeverityFilter: (severity: string) => void;
  typeFilter: ReportType | 'all';
  setTypeFilter: (type: ReportType | 'all') => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  // Pagination
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  totalCount: number;
  // Actions
  updateReportStatus: (id: string, type: ReportType, newStatus: string) => Promise<void>;
  updateBulkStatus: (ids: { id: string; type: ReportType }[], newStatus: string) => Promise<void>;
  deleteReport: (id: string, type: ReportType) => Promise<void>;
  deleteBulkReports: (ids: { id: string; type: ReportType }[]) => Promise<void>;
  exportToCSV: () => void;
  refetch: () => void;
}

export const useReportsAdmin = (): UseReportsAdminReturn => {
  const [reports, setReports] = useState<UnifiedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<ReportsKPIs>({
    total: 0,
    pending: 0,
    in_analysis: 0,
    resolved: 0,
    urban_count: 0,
    transport_count: 0,
    critical_count: 0,
    trends: { total: 0, pending: 0 },
  });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchKPIs = useCallback(async () => {
    setKpisLoading(true);
    try {
      // Urban reports counts
      const { count: urbanTotal } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true });

      const { count: urbanPending } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: urbanAnalysis } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_analysis');

      const { count: urbanResolved } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      const { count: urbanCritical } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical');

      // Transport reports counts
      const { count: transportTotal } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true });

      const { count: transportPending } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: transportAnalysis } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_analysis');

      const { count: transportResolved } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      const { count: transportCritical } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical');

      // Calculate trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: urbanRecentCount } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: transportRecentCount } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const total = (urbanTotal || 0) + (transportTotal || 0);
      const recentTotal = (urbanRecentCount || 0) + (transportRecentCount || 0);

      setKpis({
        total,
        pending: (urbanPending || 0) + (transportPending || 0),
        in_analysis: (urbanAnalysis || 0) + (transportAnalysis || 0),
        resolved: (urbanResolved || 0) + (transportResolved || 0),
        urban_count: urbanTotal || 0,
        transport_count: transportTotal || 0,
        critical_count: (urbanCritical || 0) + (transportCritical || 0),
        trends: {
          total: total > 0 ? Math.round((recentTotal / total) * 100) : 0,
          pending: 0, // Could be calculated similarly
        },
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setKpisLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let urbanReports: UnifiedReport[] = [];
      let transportReports: UnifiedReport[] = [];
      let urbanCount = 0;
      let transportCount = 0;

      // Fetch urban reports if filter allows
      if (typeFilter === 'all' || typeFilter === 'urban') {
        let urbanQuery = supabase
          .from('urban_reports')
          .select('*', { count: 'exact' });

        if (statusFilter !== 'all') {
          urbanQuery = urbanQuery.eq('status', statusFilter);
        }
        if (severityFilter !== 'all') {
          urbanQuery = urbanQuery.eq('severity', severityFilter);
        }
        if (searchTerm) {
          urbanQuery = urbanQuery.or(`description.ilike.%${searchTerm}%,location_address.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
        }
        if (dateRange.from) {
          urbanQuery = urbanQuery.gte('created_at', dateRange.from.toISOString());
        }
        if (dateRange.to) {
          urbanQuery = urbanQuery.lte('created_at', dateRange.to.toISOString());
        }

        urbanQuery = urbanQuery.order('created_at', { ascending: false });

        const { data: urbanData, count, error: urbanError } = await urbanQuery;

        if (urbanError) throw urbanError;

        urbanCount = count || 0;

        // Fetch authors and engagement for urban reports
        if (urbanData && urbanData.length > 0) {
          const userIds = [...new Set(urbanData.map(r => r.user_id))];
          const reportIds = urbanData.map(r => r.id);

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const { data: likesData } = await supabase
            .from('urban_report_likes')
            .select('report_id')
            .in('report_id', reportIds);

          const { data: commentsData } = await supabase
            .from('urban_report_comments')
            .select('report_id')
            .in('report_id', reportIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          const likesCount = new Map<string, number>();
          const commentsCount = new Map<string, number>();

          likesData?.forEach(l => {
            likesCount.set(l.report_id, (likesCount.get(l.report_id) || 0) + 1);
          });
          commentsData?.forEach(c => {
            commentsCount.set(c.report_id, (commentsCount.get(c.report_id) || 0) + 1);
          });

          urbanReports = urbanData.map(r => ({
            id: r.id,
            type: 'urban' as ReportType,
            title: r.category,
            description: r.description,
            severity: r.severity || 'medium',
            status: r.status || 'pending',
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: r.location_address,
            author: profileMap.get(r.user_id) || null,
            urban_data: {
              category: r.category,
              subcategory: r.subcategory,
              photos: r.photos,
              latitude: r.latitude,
              longitude: r.longitude,
              likes_count: likesCount.get(r.id) || 0,
              comments_count: commentsCount.get(r.id) || 0,
              ai_classification: r.ai_classification as Record<string, unknown> | null,
            },
            n8n_processed: r.n8n_processed,
            n8n_priority: r.n8n_priority,
            n8n_tags: r.n8n_tags,
            n8n_validated_category: r.n8n_validated_category,
            n8n_enriched_data: r.n8n_enriched_data as Record<string, unknown> | null,
          }));
        }
      }

      // Fetch transport reports if filter allows
      if (typeFilter === 'all' || typeFilter === 'transport') {
        let transportQuery = supabase
          .from('transport_reports')
          .select('*', { count: 'exact' });

        if (statusFilter !== 'all') {
          transportQuery = transportQuery.eq('status', statusFilter);
        }
        if (severityFilter !== 'all') {
          transportQuery = transportQuery.eq('severity', severityFilter);
        }
        if (searchTerm) {
          transportQuery = transportQuery.or(`description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,report_type.ilike.%${searchTerm}%`);
        }
        if (dateRange.from) {
          transportQuery = transportQuery.gte('created_at', dateRange.from.toISOString());
        }
        if (dateRange.to) {
          transportQuery = transportQuery.lte('created_at', dateRange.to.toISOString());
        }

        transportQuery = transportQuery.order('created_at', { ascending: false });

        const { data: transportData, count, error: transportError } = await transportQuery;

        if (transportError) throw transportError;

        transportCount = count || 0;

        // Fetch authors for transport reports
        if (transportData && transportData.length > 0) {
          const userIds = [...new Set(transportData.map(r => r.user_id))];

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          transportReports = transportData.map(r => ({
            id: r.id,
            type: 'transport' as ReportType,
            title: r.report_type,
            description: r.description,
            severity: r.severity,
            status: r.status,
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: r.location,
            author: profileMap.get(r.user_id) || null,
            transport_data: {
              report_type: r.report_type,
              line_id: r.line_id,
              line_code_custom: r.line_code_custom,
              occurrence_date: r.occurrence_date,
              occurrence_time: r.occurrence_time,
              impact_description: r.impact_description,
              ai_sentiment: r.ai_sentiment,
              ai_category: r.ai_category,
              ai_pattern_detected: r.ai_pattern_detected,
              responded_at: r.responded_at,
            },
            n8n_processed: r.n8n_processed,
            n8n_priority: r.n8n_priority,
            n8n_tags: r.n8n_tags,
            n8n_validated_category: r.n8n_validated_category,
            n8n_enriched_data: r.n8n_enriched_data as Record<string, unknown> | null,
          }));
        }
      }

      // Merge and sort by date
      const allReports = [...urbanReports, ...transportReports]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(from, to + 1);

      setReports(allReports);
      setTotalCount(urbanCount + transportCount);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Erro ao carregar relatos');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, severityFilter, typeFilter, dateRange]);

  // Actions
  const updateReportStatus = async (id: string, type: ReportType, newStatus: string) => {
    try {
      const table = type === 'urban' ? 'urban_reports' : 'transport_reports';
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status atualizado com sucesso');
      fetchReports();
      fetchKPIs();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const updateBulkStatus = async (ids: { id: string; type: ReportType }[], newStatus: string) => {
    try {
      const urbanIds = ids.filter(i => i.type === 'urban').map(i => i.id);
      const transportIds = ids.filter(i => i.type === 'transport').map(i => i.id);

      if (urbanIds.length > 0) {
        const { error } = await supabase
          .from('urban_reports')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .in('id', urbanIds);
        if (error) throw error;
      }

      if (transportIds.length > 0) {
        const { error } = await supabase
          .from('transport_reports')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .in('id', transportIds);
        if (error) throw error;
      }

      toast.success(`${ids.length} relatos atualizados`);
      fetchReports();
      fetchKPIs();
    } catch (error) {
      console.error('Error updating bulk status:', error);
      toast.error('Erro ao atualizar status em lote');
    }
  };

  const deleteReport = async (id: string, type: ReportType) => {
    try {
      const table = type === 'urban' ? 'urban_reports' : 'transport_reports';
      
      // Delete related data first
      if (type === 'urban') {
        await supabase.from('urban_report_likes').delete().eq('report_id', id);
        await supabase.from('urban_report_comments').delete().eq('report_id', id);
      } else {
        await supabase.from('transport_report_responses').delete().eq('report_id', id);
      }

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      toast.success('Relato excluído com sucesso');
      fetchReports();
      fetchKPIs();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Erro ao excluir relato');
    }
  };

  const deleteBulkReports = async (ids: { id: string; type: ReportType }[]) => {
    try {
      const urbanIds = ids.filter(i => i.type === 'urban').map(i => i.id);
      const transportIds = ids.filter(i => i.type === 'transport').map(i => i.id);

      if (urbanIds.length > 0) {
        await supabase.from('urban_report_likes').delete().in('report_id', urbanIds);
        await supabase.from('urban_report_comments').delete().in('report_id', urbanIds);
        const { error } = await supabase.from('urban_reports').delete().in('id', urbanIds);
        if (error) throw error;
      }

      if (transportIds.length > 0) {
        await supabase.from('transport_report_responses').delete().in('report_id', transportIds);
        const { error } = await supabase.from('transport_reports').delete().in('id', transportIds);
        if (error) throw error;
      }

      toast.success(`${ids.length} relatos excluídos`);
      fetchReports();
      fetchKPIs();
    } catch (error) {
      console.error('Error deleting bulk reports:', error);
      toast.error('Erro ao excluir relatos em lote');
    }
  };

  const exportToCSV = () => {
    if (reports.length === 0) {
      toast.error('Nenhum relato para exportar');
      return;
    }

    const headers = ['ID', 'Tipo', 'Título', 'Descrição', 'Severidade', 'Status', 'Local', 'Autor', 'Data'];
    const rows = reports.map(r => [
      r.id,
      r.type === 'urban' ? 'Urbano' : 'Transporte',
      r.title,
      r.description || '',
      r.severity,
      r.status,
      r.location || '',
      r.author?.full_name || 'Anônimo',
      new Date(r.created_at).toLocaleString('pt-BR'),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Exportação concluída');
  };

  // Effects
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  // Real-time subscriptions
  useEffect(() => {
    const urbanChannel = supabase
      .channel('reports_urban_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urban_reports' }, () => {
        fetchReports();
        fetchKPIs();
      })
      .subscribe();

    const transportChannel = supabase
      .channel('reports_transport_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_reports' }, () => {
        fetchReports();
        fetchKPIs();
      })
      .subscribe();

    return () => {
      urbanChannel.unsubscribe();
      transportChannel.unsubscribe();
    };
  }, [fetchReports, fetchKPIs]);

  return {
    reports,
    loading,
    kpis,
    kpisLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    typeFilter,
    setTypeFilter,
    dateRange,
    setDateRange,
    page,
    setPage,
    pageSize,
    totalCount,
    updateReportStatus,
    updateBulkStatus,
    deleteReport,
    deleteBulkReports,
    exportToCSV,
    refetch: fetchReports,
  };
};
