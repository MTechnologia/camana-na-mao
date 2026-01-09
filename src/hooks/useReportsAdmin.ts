import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ManifestType = 'urban' | 'transport' | 'evaluation' | 'feedback';

export interface UnifiedManifest {
  id: string;
  type: ManifestType;
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
    // Structured address fields
    protocol_code: string | null;
    street: string | null;
    street_number: string | null;
    cep: string | null;
    neighborhood: string | null;
    reference_point: string | null;
    // Impact assessment fields
    risk_level: string | null;
    risk_types: string[] | null;
    affected_scope: string | null;
    affected_estimate: number | null;
    urgency_reason: string | null;
  };
  // Transport-specific fields
  transport_data?: {
    report_type: string;
    line_id: string | null;
    line_code: string | null;
    line_name: string | null;
    occurrence_date: string;
    occurrence_time: string | null;
    impact_description: string | null;
    ai_sentiment: string | null;
    ai_category: string | null;
    ai_pattern_detected: boolean | null;
    responded_at: string | null;
    responses_count: number;
    protocol_code: string | null;
  };
  // Evaluation-specific fields
  evaluation_data?: {
    service_id: string;
    service_name: string | null;
    service_type: string | null;
    rating_stars: number;
    rating_text: string | null;
    sentiment: string | null;
    visit_id: string;
    is_anonymous: boolean;
  };
  // N8N fields (common for urban/transport)
  n8n_processed?: boolean | null;
  n8n_priority?: string | null;
  n8n_tags?: string[] | null;
  n8n_validated_category?: string | null;
  n8n_enriched_data?: Record<string, unknown> | null;
}

export interface ManifestKPIs {
  total: number;
  pending: number;
  in_analysis: number;
  resolved: number;
  urban_count: number;
  transport_count: number;
  evaluation_count: number;
  feedback_count: number;
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
  manifests: UnifiedManifest[];
  loading: boolean;
  kpis: ManifestKPIs;
  kpisLoading: boolean;
  // Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  severityFilter: string;
  setSeverityFilter: (severity: string) => void;
  typeFilter: ManifestType | 'all';
  setTypeFilter: (type: ManifestType | 'all') => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  regionFilter: string;
  setRegionFilter: (region: string) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  // Dynamic options
  availableCategories: { value: string; label: string }[];
  availableRegions: string[];
  // Pagination
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  totalCount: number;
  // Actions
  updateManifestStatus: (id: string, type: ManifestType, newStatus: string) => Promise<void>;
  updateBulkStatus: (ids: { id: string; type: ManifestType }[], newStatus: string) => Promise<void>;
  deleteManifest: (id: string, type: ManifestType) => Promise<void>;
  deleteBulkManifests: (ids: { id: string; type: ManifestType }[]) => Promise<void>;
  exportToCSV: () => void;
  refetch: () => void;
}

export const useReportsAdmin = (): UseReportsAdminReturn => {
  const [manifests, setManifests] = useState<UnifiedManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<ManifestKPIs>({
    total: 0,
    pending: 0,
    in_analysis: 0,
    resolved: 0,
    urban_count: 0,
    transport_count: 0,
    evaluation_count: 0,
    feedback_count: 0,
    critical_count: 0,
    trends: { total: 0, pending: 0 },
  });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<ManifestType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Dynamic filter options
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  // Static category options
  const availableCategories = [
    { value: 'iluminacao', label: 'Iluminação' },
    { value: 'calcada', label: 'Calçada' },
    { value: 'via_publica', label: 'Via Pública' },
    { value: 'lixo', label: 'Lixo e Limpeza' },
    { value: 'area_verde', label: 'Área Verde' },
    { value: 'poluicao', label: 'Poluição' },
    { value: 'seguranca', label: 'Segurança' },
    { value: 'transito', label: 'Trânsito' },
    { value: 'esgoto', label: 'Esgoto' },
    { value: 'outro', label: 'Outro' },
  ];

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchKPIs = useCallback(async () => {
    setKpisLoading(true);
    try {
      // Urban reports counts (excluding feedback)
      const { count: urbanTotal } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .neq('category', 'feedback_camara');

      const { count: urbanPending } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .neq('category', 'feedback_camara')
        .eq('status', 'pending');

      const { count: urbanCritical } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .neq('category', 'feedback_camara')
        .eq('severity', 'critical');

      // Feedback counts (category = feedback_camara)
      const { count: feedbackTotal } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .eq('category', 'feedback_camara');

      // Transport reports counts
      const { count: transportTotal } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true });

      const { count: transportPending } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: transportCritical } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'high');

      // Service ratings counts
      const { count: evaluationTotal } = await supabase
        .from('service_ratings')
        .select('*', { count: 'exact', head: true });

      // Calculate trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentUrban } = await supabase
        .from('urban_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: recentTransport } = await supabase
        .from('transport_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: recentEvaluation } = await supabase
        .from('service_ratings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const total = (urbanTotal || 0) + (feedbackTotal || 0) + (transportTotal || 0) + (evaluationTotal || 0);
      const recentTotal = (recentUrban || 0) + (recentTransport || 0) + (recentEvaluation || 0);

      setKpis({
        total,
        pending: (urbanPending || 0) + (transportPending || 0),
        in_analysis: 0,
        resolved: 0,
        urban_count: urbanTotal || 0,
        transport_count: transportTotal || 0,
        evaluation_count: evaluationTotal || 0,
        feedback_count: feedbackTotal || 0,
        critical_count: (urbanCritical || 0) + (transportCritical || 0),
        trends: {
          total: total > 0 ? Math.round((recentTotal / total) * 100) : 0,
          pending: 0,
        },
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setKpisLoading(false);
    }
  }, []);

  const fetchManifests = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let allManifests: UnifiedManifest[] = [];
      let urbanCount = 0;
      let transportCount = 0;
      let evaluationCount = 0;

      // Fetch urban reports (excluding feedback)
      if (typeFilter === 'all' || typeFilter === 'urban') {
        let urbanQuery = supabase
          .from('urban_reports')
          .select('*', { count: 'exact' })
          .neq('category', 'feedback_camara');

        if (statusFilter !== 'all') urbanQuery = urbanQuery.eq('status', statusFilter);
        if (severityFilter !== 'all') urbanQuery = urbanQuery.eq('severity', severityFilter);
        if (categoryFilter !== 'all') urbanQuery = urbanQuery.eq('category', categoryFilter);
        if (regionFilter !== 'all') urbanQuery = urbanQuery.eq('neighborhood', regionFilter);
        if (searchTerm) urbanQuery = urbanQuery.or(`description.ilike.%${searchTerm}%,location_address.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
        if (dateRange.from) urbanQuery = urbanQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) urbanQuery = urbanQuery.lte('created_at', dateRange.to.toISOString());

        const { data: urbanData, count, error } = await urbanQuery.order('created_at', { ascending: false });
        if (error) throw error;

        urbanCount = count || 0;

        if (urbanData?.length) {
          const userIds = [...new Set(urbanData.map(r => r.user_id))];
          const reportIds = urbanData.map(r => r.id);

          const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
            supabase.from('urban_report_likes').select('report_id').in('report_id', reportIds),
            supabase.from('urban_report_comments').select('report_id').in('report_id', reportIds),
          ]);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          const likesCount = new Map<string, number>();
          const commentsCount = new Map<string, number>();
          likes?.forEach(l => likesCount.set(l.report_id, (likesCount.get(l.report_id) || 0) + 1));
          comments?.forEach(c => commentsCount.set(c.report_id, (commentsCount.get(c.report_id) || 0) + 1));

          allManifests.push(...urbanData.map(r => ({
            id: r.id,
            type: 'urban' as ManifestType,
            title: r.subcategory || r.category,
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
              // Structured address
              protocol_code: r.protocol_code,
              street: r.street,
              street_number: r.street_number,
              cep: r.cep,
              neighborhood: r.neighborhood,
              reference_point: r.reference_point,
              // Impact assessment
              risk_level: r.risk_level,
              risk_types: r.risk_types,
              affected_scope: r.affected_scope,
              affected_estimate: r.affected_estimate,
              urgency_reason: r.urgency_reason,
            },
            n8n_processed: r.n8n_processed,
            n8n_priority: r.n8n_priority,
            n8n_tags: r.n8n_tags,
            n8n_validated_category: r.n8n_validated_category,
            n8n_enriched_data: r.n8n_enriched_data as Record<string, unknown> | null,
          })));
        }
      }

      // Fetch feedback (category = feedback_camara)
      if (typeFilter === 'all' || typeFilter === 'feedback') {
        let feedbackQuery = supabase
          .from('urban_reports')
          .select('*', { count: 'exact' })
          .eq('category', 'feedback_camara');

        if (statusFilter !== 'all') feedbackQuery = feedbackQuery.eq('status', statusFilter);
        if (searchTerm) feedbackQuery = feedbackQuery.or(`description.ilike.%${searchTerm}%,subcategory.ilike.%${searchTerm}%`);
        if (dateRange.from) feedbackQuery = feedbackQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) feedbackQuery = feedbackQuery.lte('created_at', dateRange.to.toISOString());

        const { data: feedbackData, error } = await feedbackQuery.order('created_at', { ascending: false });
        if (error) throw error;

        if (feedbackData?.length) {
          const userIds = [...new Set(feedbackData.map(r => r.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          allManifests.push(...feedbackData.map(r => ({
            id: r.id,
            type: 'feedback' as ManifestType,
            title: r.subcategory || 'Feedback Câmara',
            description: r.description,
            severity: r.severity || 'medium',
            status: r.status || 'pending',
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: null,
            author: profileMap.get(r.user_id) || null,
            urban_data: {
              category: r.category,
              subcategory: r.subcategory,
              photos: r.photos,
              latitude: null,
              longitude: null,
              likes_count: 0,
              comments_count: 0,
              ai_classification: r.ai_classification as Record<string, unknown> | null,
              // Structured address - feedback doesn't use these
              protocol_code: null,
              street: null,
              street_number: null,
              cep: null,
              neighborhood: null,
              reference_point: null,
              // Impact assessment - feedback doesn't use these
              risk_level: null,
              risk_types: null,
              affected_scope: null,
              affected_estimate: null,
              urgency_reason: null,
            },
          })));
        }
      }

      // Fetch transport reports
      if (typeFilter === 'all' || typeFilter === 'transport') {
        let transportQuery = supabase
          .from('transport_reports')
          .select('*, transport_lines(line_code, line_name)', { count: 'exact' });

        if (statusFilter !== 'all') transportQuery = transportQuery.eq('status', statusFilter);
        if (severityFilter !== 'all') transportQuery = transportQuery.eq('severity', severityFilter);
        if (searchTerm) transportQuery = transportQuery.or(`description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,report_type.ilike.%${searchTerm}%`);
        if (dateRange.from) transportQuery = transportQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) transportQuery = transportQuery.lte('created_at', dateRange.to.toISOString());

        const { data: transportData, count, error } = await transportQuery.order('created_at', { ascending: false });
        if (error) throw error;

        transportCount = count || 0;

        if (transportData?.length) {
          const userIds = [...new Set(transportData.map(r => r.user_id))];
          const reportIds = transportData.map(r => r.id);

          const [{ data: profiles }, { data: responses }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
            supabase.from('transport_report_responses').select('report_id').in('report_id', reportIds),
          ]);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          const responsesCount = new Map<string, number>();
          responses?.forEach(r => responsesCount.set(r.report_id, (responsesCount.get(r.report_id) || 0) + 1));

          allManifests.push(...transportData.map(r => ({
            id: r.id,
            type: 'transport' as ManifestType,
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
              line_code: (r.transport_lines as any)?.line_code || r.line_code_custom,
              line_name: (r.transport_lines as any)?.line_name || null,
              occurrence_date: r.occurrence_date,
              occurrence_time: r.occurrence_time,
              impact_description: r.impact_description,
              ai_sentiment: r.ai_sentiment,
              ai_category: r.ai_category,
              ai_pattern_detected: r.ai_pattern_detected,
              responded_at: r.responded_at,
              responses_count: responsesCount.get(r.id) || 0,
              protocol_code: r.protocol_code,
            },
            n8n_processed: r.n8n_processed,
            n8n_priority: r.n8n_priority,
            n8n_tags: r.n8n_tags,
            n8n_validated_category: r.n8n_validated_category,
            n8n_enriched_data: r.n8n_enriched_data as Record<string, unknown> | null,
          })));
        }
      }

      // Fetch service evaluations
      if (typeFilter === 'all' || typeFilter === 'evaluation') {
        let evalQuery = supabase
          .from('service_ratings')
          .select('*, public_services(name, service_type)', { count: 'exact' });

        if (searchTerm) evalQuery = evalQuery.or(`rating_text.ilike.%${searchTerm}%`);
        if (dateRange.from) evalQuery = evalQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) evalQuery = evalQuery.lte('created_at', dateRange.to.toISOString());

        const { data: evalData, count, error } = await evalQuery.order('created_at', { ascending: false });
        if (error) throw error;

        evaluationCount = count || 0;

        if (evalData?.length) {
          const userIds = [...new Set(evalData.map(r => r.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          allManifests.push(...evalData.map(r => ({
            id: r.id,
            type: 'evaluation' as ManifestType,
            title: (r.public_services as any)?.name || 'Avaliação de Serviço',
            description: r.rating_text,
            severity: r.rating_stars <= 2 ? 'high' : r.rating_stars <= 3 ? 'medium' : 'low',
            status: 'completed',
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: null,
            author: r.is_anonymous ? null : profileMap.get(r.user_id) || null,
            evaluation_data: {
              service_id: r.service_id,
              service_name: (r.public_services as any)?.name || null,
              service_type: (r.public_services as any)?.service_type || null,
              rating_stars: r.rating_stars,
              rating_text: r.rating_text,
              sentiment: r.sentiment,
              visit_id: r.visit_id,
              is_anonymous: r.is_anonymous || false,
            },
          })));
        }
      }

      // Sort by date and paginate
      const sorted = allManifests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const paginated = sorted.slice(from, to + 1);

      setManifests(paginated);
      setTotalCount(urbanCount + transportCount + evaluationCount);
    } catch (error) {
      console.error('Error fetching manifests:', error);
      toast.error('Erro ao carregar manifestações');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, severityFilter, typeFilter, categoryFilter, regionFilter, dateRange]);

  const updateManifestStatus = useCallback(async (id: string, type: ManifestType, newStatus: string) => {
    if (type === 'evaluation') {
      toast.error('Avaliações não podem ter status alterado');
      return;
    }

    // Optimistic update - update UI immediately
    const previousManifests = [...manifests];
    const oldManifest = manifests.find(m => m.id === id);
    const oldStatus = oldManifest?.status;
    
    setManifests(prev => prev.map(m => 
      m.id === id ? { ...m, status: newStatus, updated_at: new Date().toISOString() } : m
    ));

    try {
      const table = type === 'urban' || type === 'feedback' ? 'urban_reports' : 'transport_reports';
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Register audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: type === 'urban' || type === 'feedback' ? 'urban_report' : 'transport_report',
          entity_id: id,
          old_values: { status: oldStatus },
          new_values: { status: newStatus },
          user_agent: navigator.userAgent
        });
      }

      toast.success('Status atualizado');
      fetchKPIs();
    } catch (error) {
      // Rollback on error
      setManifests(previousManifests);
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  }, [manifests, fetchKPIs]);

  const updateBulkStatus = async (ids: { id: string; type: ManifestType }[], newStatus: string) => {
    try {
      const urbanIds = ids.filter(i => i.type === 'urban' || i.type === 'feedback').map(i => i.id);
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

      toast.success(`${ids.length} manifestações atualizadas`);
      fetchManifests();
      fetchKPIs();
    } catch (error) {
      console.error('Error updating bulk status:', error);
      toast.error('Erro ao atualizar status em lote');
    }
  };

  const deleteManifest = async (id: string, type: ManifestType) => {
    try {
      // Get manifest data before deletion for audit
      const manifestToDelete = manifests.find(m => m.id === id);
      
      if (type === 'urban' || type === 'feedback') {
        await supabase.from('urban_report_likes').delete().eq('report_id', id);
        await supabase.from('urban_report_comments').delete().eq('report_id', id);
        await supabase.from('council_member_referrals').delete().eq('urban_report_id', id);
        const { error } = await supabase.from('urban_reports').delete().eq('id', id);
        if (error) throw error;
      } else if (type === 'transport') {
        await supabase.from('transport_report_responses').delete().eq('report_id', id);
        await supabase.from('council_member_referrals').delete().eq('transport_report_id', id);
        const { error } = await supabase.from('transport_reports').delete().eq('id', id);
        if (error) throw error;
      } else if (type === 'evaluation') {
        await supabase.from('council_member_referrals').delete().eq('service_rating_id', id);
        const { error } = await supabase.from('service_ratings').delete().eq('id', id);
        if (error) throw error;
      }

      // Register audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'delete',
          entity_type: type === 'urban' ? 'urban_report' : type === 'transport' ? 'transport_report' : type === 'evaluation' ? 'service_rating' : 'feedback',
          entity_id: id,
          old_values: manifestToDelete ? { title: manifestToDelete.title, status: manifestToDelete.status } : null,
          user_agent: navigator.userAgent
        });
      }

      toast.success('Manifestação excluída com sucesso');
      fetchManifests();
      fetchKPIs();
    } catch (error) {
      console.error('Error deleting manifest:', error);
      toast.error('Erro ao excluir manifestação');
    }
  };

  const deleteBulkManifests = async (ids: { id: string; type: ManifestType }[]) => {
    try {
      for (const { id, type } of ids) {
        await deleteManifest(id, type);
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Erro ao excluir em lote');
    }
  };

  const exportToCSV = async () => {
    const headers = ['ID', 'Tipo', 'Título', 'Descrição', 'Severidade', 'Status', 'Data', 'Autor'];
    const typeLabels: Record<ManifestType, string> = {
      urban: 'Urbana',
      transport: 'Transporte',
      evaluation: 'Avaliação',
      feedback: 'Feedback',
    };

    const rows = manifests.map(m => [
      m.id,
      typeLabels[m.type],
      m.title,
      m.description || '',
      m.severity,
      m.status,
      m.created_at,
      m.author?.full_name || 'Anônimo',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifestacoes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    // Register export log and audit log
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Register in export_logs
        await supabase.from('export_logs').insert({
          user_id: user.id,
          export_type: typeFilter === 'all' ? 'all_manifests' : typeFilter,
          format: 'csv',
          status: 'completed',
          row_count: manifests.length,
          filters: {
            status: statusFilter,
            severity: severityFilter,
            type: typeFilter,
            search: searchTerm,
            dateRange: dateRange.from || dateRange.to ? {
              from: dateRange.from?.toISOString(),
              to: dateRange.to?.toISOString()
            } : null
          },
          completed_at: new Date().toISOString()
        });

        // Register audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'export',
          entity_type: 'manifestations',
          metadata: {
            export_type: typeFilter === 'all' ? 'all_manifests' : typeFilter,
            format: 'csv',
            row_count: manifests.length,
            filters: { status: statusFilter, severity: severityFilter, type: typeFilter }
          },
          user_agent: navigator.userAgent
        });
      }
    } catch (error) {
      console.error('Error logging export:', error);
    }

    toast.success('CSV exportado com sucesso');
  };

  // Fetch available regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      const { data } = await supabase
        .from('urban_reports')
        .select('neighborhood')
        .not('neighborhood', 'is', null);
      
      const uniqueRegions = [...new Set(data?.map(r => r.neighborhood).filter(Boolean) as string[])].sort();
      setAvailableRegions(uniqueRegions);
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    fetchKPIs();
    fetchManifests();
  }, [fetchKPIs, fetchManifests]);

  useEffect(() => {
    const urbanChannel = supabase
      .channel('urban-reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urban_reports' }, () => {
        fetchManifests();
        fetchKPIs();
      })
      .subscribe();

    const transportChannel = supabase
      .channel('transport-reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_reports' }, () => {
        fetchManifests();
        fetchKPIs();
      })
      .subscribe();

    const ratingsChannel = supabase
      .channel('ratings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_ratings' }, () => {
        fetchManifests();
        fetchKPIs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(urbanChannel);
      supabase.removeChannel(transportChannel);
      supabase.removeChannel(ratingsChannel);
    };
  }, [fetchManifests, fetchKPIs]);

  return {
    manifests,
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
    categoryFilter,
    setCategoryFilter,
    regionFilter,
    setRegionFilter,
    dateRange,
    setDateRange,
    availableCategories,
    availableRegions,
    page,
    setPage,
    pageSize,
    totalCount,
    updateManifestStatus,
    updateBulkStatus,
    deleteManifest,
    deleteBulkManifests,
    exportToCSV,
    refetch: fetchManifests,
  };
};
