import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

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
    /** published | pending_review | rejected */
    publication_status?: string;
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
  updateManifestCategory: (manifest: UnifiedManifest, newCategory: string, newSubcategory: string | null) => Promise<void>;
  updateBulkStatus: (ids: { id: string; type: ManifestType }[], newStatus: string) => Promise<void>;
  deleteManifest: (id: string, type: ManifestType) => Promise<void>;
  deleteBulkManifests: (ids: { id: string; type: ManifestType }[]) => Promise<void>;
  exportToCSV: () => void;
  refetch: () => void;
}

// Projeção mínima para lista (campos necessários para ManifestCard)
const URBAN_LIST_FIELDS = 'id,category,subcategory,description,severity,status,created_at,updated_at,location_address,neighborhood,user_id,protocol_code';
const TRANSPORT_LIST_FIELDS = 'id,report_type,description,severity,status,created_at,updated_at,location,user_id,line_id,occurrence_date,occurrence_time,protocol_code,responded_at';
const EVALUATION_LIST_FIELDS =
  'id,rating_stars,rating_text,sentiment,created_at,updated_at,user_id,service_id,is_anonymous,publication_status';

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

  // Debounced search term (300ms)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
      // Executar todas as contagens em paralelo
      const [
        urbanTotalRes, urbanPendingRes, urbanCriticalRes, feedbackTotalRes,
        transportTotalRes, transportPendingRes, transportCriticalRes,
        evaluationTotalRes,
        recentUrbanRes, recentTransportRes, recentEvaluationRes
      ] = await Promise.all([
        supabase.from('urban_reports').select('*', { count: 'exact', head: true }).neq('category', 'feedback_camara'),
        supabase.from('urban_reports').select('*', { count: 'exact', head: true }).neq('category', 'feedback_camara').eq('status', 'pending'),
        supabase.from('urban_reports').select('*', { count: 'exact', head: true }).neq('category', 'feedback_camara').eq('severity', 'critical'),
        supabase.from('urban_reports').select('*', { count: 'exact', head: true }).eq('category', 'feedback_camara'),
        supabase.from('transport_reports').select('*', { count: 'exact', head: true }),
        supabase.from('transport_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transport_reports').select('*', { count: 'exact', head: true }).eq('severity', 'high'),
        supabase.from('service_ratings').select('*', { count: 'exact', head: true }),
        supabase.from('urban_reports').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('transport_reports').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('service_ratings').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const urbanTotal = urbanTotalRes.count || 0;
      const urbanPending = urbanPendingRes.count || 0;
      const urbanCritical = urbanCriticalRes.count || 0;
      const feedbackTotal = feedbackTotalRes.count || 0;
      const transportTotal = transportTotalRes.count || 0;
      const transportPending = transportPendingRes.count || 0;
      const transportCritical = transportCriticalRes.count || 0;
      const evaluationTotal = evaluationTotalRes.count || 0;
      const recentUrban = recentUrbanRes.count || 0;
      const recentTransport = recentTransportRes.count || 0;
      const recentEvaluation = recentEvaluationRes.count || 0;

      const total = urbanTotal + feedbackTotal + transportTotal + evaluationTotal;
      const recentTotal = recentUrban + recentTransport + recentEvaluation;

      setKpis({
        total,
        pending: urbanPending + transportPending,
        in_analysis: 0,
        resolved: 0,
        urban_count: urbanTotal,
        transport_count: transportTotal,
        evaluation_count: evaluationTotal,
        feedback_count: feedbackTotal,
        critical_count: urbanCritical + transportCritical,
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
      const fetchLimit = pageSize * 3; // Overfetch para merge

      // Preparar queries em paralelo
      const queries: Promise<{ data?: unknown[]; error?: Error; count?: number }>[] = [];
      const queryTypes: string[] = [];

      // Urban reports (excluding feedback)
      if (typeFilter === 'all' || typeFilter === 'urban') {
        let urbanQuery = supabase.from('urban_reports').select(URBAN_LIST_FIELDS, { count: 'exact' }).neq('category', 'feedback_camara');
        if (statusFilter !== 'all') urbanQuery = urbanQuery.eq('status', statusFilter);
        if (severityFilter !== 'all') urbanQuery = urbanQuery.eq('severity', severityFilter);
        if (categoryFilter !== 'all') urbanQuery = urbanQuery.eq('category', categoryFilter);
        if (regionFilter !== 'all') urbanQuery = urbanQuery.eq('neighborhood', regionFilter);
        if (debouncedSearchTerm) urbanQuery = urbanQuery.or(`description.ilike.%${debouncedSearchTerm}%,location_address.ilike.%${debouncedSearchTerm}%,category.ilike.%${debouncedSearchTerm}%`);
        if (dateRange.from) urbanQuery = urbanQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) urbanQuery = urbanQuery.lte('created_at', dateRange.to.toISOString());
        queries.push(Promise.resolve(urbanQuery.order('created_at', { ascending: false }).limit(fetchLimit)));
        queryTypes.push('urban');
      }

      // Feedback (category = feedback_camara)
      if (typeFilter === 'all' || typeFilter === 'feedback') {
        let feedbackQuery = supabase.from('urban_reports').select(URBAN_LIST_FIELDS, { count: 'exact' }).eq('category', 'feedback_camara');
        if (statusFilter !== 'all') feedbackQuery = feedbackQuery.eq('status', statusFilter);
        if (debouncedSearchTerm) feedbackQuery = feedbackQuery.or(`description.ilike.%${debouncedSearchTerm}%,subcategory.ilike.%${debouncedSearchTerm}%`);
        if (dateRange.from) feedbackQuery = feedbackQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) feedbackQuery = feedbackQuery.lte('created_at', dateRange.to.toISOString());
        queries.push(Promise.resolve(feedbackQuery.order('created_at', { ascending: false }).limit(fetchLimit)));
        queryTypes.push('feedback');
      }

      // Transport reports
      if (typeFilter === 'all' || typeFilter === 'transport') {
        let transportQuery = supabase.from('transport_reports').select(`${TRANSPORT_LIST_FIELDS},transport_lines(line_code,line_name)`, { count: 'exact' });
        if (statusFilter !== 'all') transportQuery = transportQuery.eq('status', statusFilter);
        if (severityFilter !== 'all') transportQuery = transportQuery.eq('severity', severityFilter);
        if (debouncedSearchTerm) transportQuery = transportQuery.or(`description.ilike.%${debouncedSearchTerm}%,location.ilike.%${debouncedSearchTerm}%,report_type.ilike.%${debouncedSearchTerm}%`);
        if (dateRange.from) transportQuery = transportQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) transportQuery = transportQuery.lte('created_at', dateRange.to.toISOString());
        queries.push(Promise.resolve(transportQuery.order('created_at', { ascending: false }).limit(fetchLimit)));
        queryTypes.push('transport');
      }

      // Service evaluations
      if (typeFilter === 'all' || typeFilter === 'evaluation') {
        let evalQuery = supabase.from('service_ratings').select(`${EVALUATION_LIST_FIELDS},public_services(name,service_type)`, { count: 'exact' });
        if (debouncedSearchTerm) evalQuery = evalQuery.or(`rating_text.ilike.%${debouncedSearchTerm}%`);
        if (dateRange.from) evalQuery = evalQuery.gte('created_at', dateRange.from.toISOString());
        if (dateRange.to) evalQuery = evalQuery.lte('created_at', dateRange.to.toISOString());
        queries.push(Promise.resolve(evalQuery.order('created_at', { ascending: false }).limit(fetchLimit)));
        queryTypes.push('evaluation');
      }

      // Executar todas as queries em paralelo
      const results = await Promise.all(queries);

      const allManifests: UnifiedManifest[] = [];
      let urbanCount = 0, feedbackCount = 0, transportCount = 0, evaluationCount = 0;

      results.forEach((result, index) => {
        const type = queryTypes[index];
        if (result.error) {
          console.error(`Error fetching ${type}:`, result.error);
          return;
        }

        const data = result.data || [];
        const count = result.count || 0;

        if (type === 'urban') {
          urbanCount = count;
          allManifests.push(...data.map((r: Record<string, unknown>) => ({
            id: r.id,
            type: 'urban' as ManifestType,
            title: r.subcategory || r.category,
            description: r.description,
            severity: r.severity || 'medium',
            status: r.status || 'pending',
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: r.location_address,
            author: null,
            urban_data: {
              category: r.category,
              subcategory: r.subcategory,
              photos: null,
              latitude: null,
              longitude: null,
              likes_count: 0,
              comments_count: 0,
              ai_classification: null,
              protocol_code: r.protocol_code,
              street: null,
              street_number: null,
              cep: null,
              neighborhood: r.neighborhood,
              reference_point: null,
              risk_level: null,
              risk_types: null,
              affected_scope: null,
              affected_estimate: null,
              urgency_reason: null,
            },
          })));
        } else if (type === 'feedback') {
          feedbackCount = count;
          allManifests.push(...data.map((r: Record<string, unknown>) => ({
            id: r.id,
            type: 'feedback' as ManifestType,
            title: r.subcategory || 'Feedback Câmara',
            description: r.description,
            severity: r.severity || 'medium',
            status: r.status || 'pending',
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: null,
            author: null,
            urban_data: {
              category: r.category,
              subcategory: r.subcategory,
              photos: null,
              latitude: null,
              longitude: null,
              likes_count: 0,
              comments_count: 0,
              ai_classification: null,
              protocol_code: null,
              street: null,
              street_number: null,
              cep: null,
              neighborhood: null,
              reference_point: null,
              risk_level: null,
              risk_types: null,
              affected_scope: null,
              affected_estimate: null,
              urgency_reason: null,
            },
          })));
        } else if (type === 'transport') {
          transportCount = count;
          allManifests.push(...data.map((r: Record<string, unknown>) => ({
            id: r.id,
            type: 'transport' as ManifestType,
            title: r.report_type,
            description: r.description,
            severity: r.severity,
            status: r.status,
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: r.location,
            author: null,
            transport_data: {
              report_type: r.report_type,
              line_id: r.line_id,
              line_code: (r.transport_lines as { line_code?: string; line_name?: string } | null)?.line_code || null,
              line_name: (r.transport_lines as { line_code?: string; line_name?: string } | null)?.line_name || null,
              occurrence_date: r.occurrence_date,
              occurrence_time: r.occurrence_time,
              impact_description: null,
              ai_sentiment: null,
              ai_category: null,
              ai_pattern_detected: null,
              responded_at: r.responded_at,
              responses_count: 0,
              protocol_code: r.protocol_code,
            },
          })));
        } else if (type === 'evaluation') {
          evaluationCount = count;
          allManifests.push(...data.map((r: Record<string, unknown>) => ({
            id: r.id,
            type: 'evaluation' as ManifestType,
            title: (r.public_services as { name?: string; service_type?: string } | null)?.name || 'Avaliação de Serviço',
            description: r.rating_text,
            severity: r.rating_stars <= 2 ? 'high' : r.rating_stars <= 3 ? 'medium' : 'low',
            status: 'completed',
            created_at: r.created_at || '',
            updated_at: r.updated_at,
            location: null,
            author: null,
            evaluation_data: {
              service_id: r.service_id,
              service_name: (r.public_services as { name?: string; service_type?: string } | null)?.name || null,
              service_type: (r.public_services as { name?: string; service_type?: string } | null)?.service_type || null,
              rating_stars: r.rating_stars,
              rating_text: r.rating_text,
              sentiment: r.sentiment,
              visit_id: '',
              is_anonymous: r.is_anonymous || false,
              publication_status: (r.publication_status as string) || 'published',
            },
          })));
        }
      });

      // Sort e paginate
      const sorted = allManifests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const paginated = sorted.slice(from, to + 1);

      // Buscar profiles apenas para os itens paginados
      const userIds = [...new Set(paginated.map(m => {
        // Extrair user_id do item original baseado no type
        const originalItem = results.flatMap(r => r.data || []).find((d: Record<string, unknown>) => d.id === m.id);
        return originalItem?.user_id;
      }).filter(Boolean))];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Atribuir profiles
        paginated.forEach(m => {
          const originalItem = results.flatMap(r => r.data || []).find((d: Record<string, unknown>) => d.id === m.id);
          if (originalItem?.user_id && profileMap.has(originalItem.user_id)) {
            m.author = profileMap.get(originalItem.user_id) || null;
          }
        });
      }

      setManifests(paginated);
      // Corrigir totalCount para incluir feedback
      setTotalCount(urbanCount + feedbackCount + transportCount + evaluationCount);
    } catch (error) {
      console.error('Error fetching manifests:', error);
      toast.error('Erro ao carregar relatos');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearchTerm, statusFilter, severityFilter, typeFilter, categoryFilter, regionFilter, dateRange]);

  const updateManifestStatus = useCallback(async (id: string, type: ManifestType, newStatus: string) => {
    if (type === 'evaluation') {
      toast.error('Avaliações não podem ter status alterado');
      return;
    }

    // Optimistic update
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
      setManifests(previousManifests);
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  }, [manifests, fetchKPIs]);

  const updateManifestCategory = useCallback(async (manifest: UnifiedManifest, newCategory: string, newSubcategory: string | null) => {
    if (manifest.type !== 'urban' && manifest.type !== 'feedback') {
      toast.error('Correção de categoria só para relatos urbanos');
      return;
    }
    const originalCategory = manifest.urban_data?.category ?? '';
    const originalSubcategory = manifest.urban_data?.subcategory ?? null;
    if (originalCategory === newCategory && originalSubcategory === newSubcategory) {
      toast.info('Nenhuma alteração');
      return;
    }
    const previousManifests = [...manifests];
    setManifests(prev => prev.map(m => {
      if (m.id !== manifest.id) return m;
      return {
        ...m,
        urban_data: m.urban_data ? { ...m.urban_data, category: newCategory, subcategory: newSubcategory } : undefined,
      };
    }));
    try {
      const { error: updateError } = await supabase
        .from('urban_reports')
        .update({ category: newCategory, subcategory: newSubcategory, updated_at: new Date().toISOString() })
        .eq('id', manifest.id);
      if (updateError) throw updateError;
      const descriptionExcerpt = (manifest.description || '').slice(0, 500) || '(sem descrição)';
      const { error: feedbackError } = await supabase
        .from('report_classification_feedback')
        .insert({
          report_type: 'urban',
          report_id: manifest.id,
          original_category: originalCategory,
          original_subcategory: originalSubcategory,
          corrected_category: newCategory,
          corrected_subcategory: newSubcategory,
          description_excerpt: descriptionExcerpt,
          source: 'admin',
        });
      if (feedbackError) {
        console.warn('Feedback de classificação não registrado (RLS?):', feedbackError);
      }
      toast.success('Categoria atualizada; correção usada para melhorar a IA.');
    } catch (error) {
      setManifests(previousManifests);
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    }
  }, [manifests]);

  const updateBulkStatus = async (ids: { id: string; type: ManifestType }[], newStatus: string) => {
    try {
      const urbanIds = ids.filter(i => i.type === 'urban' || i.type === 'feedback').map(i => i.id);
      const transportIds = ids.filter(i => i.type === 'transport').map(i => i.id);

      const updates = [];
      if (urbanIds.length > 0) {
        updates.push(supabase.from('urban_reports').update({ status: newStatus, updated_at: new Date().toISOString() }).in('id', urbanIds));
      }
      if (transportIds.length > 0) {
        updates.push(supabase.from('transport_reports').update({ status: newStatus, updated_at: new Date().toISOString() }).in('id', transportIds));
      }

      await Promise.all(updates);

      toast.success(`${ids.length} relatos atualizados`);
      fetchManifests();
      fetchKPIs();
    } catch (error) {
      console.error('Error updating bulk status:', error);
      toast.error('Erro ao atualizar status em lote');
    }
  };

  const deleteManifest = async (id: string, type: ManifestType) => {
    try {
      const manifestToDelete = manifests.find(m => m.id === id);
      
      if (type === 'urban' || type === 'feedback') {
        await Promise.all([
          supabase.from('urban_report_likes').delete().eq('report_id', id),
          supabase.from('urban_report_comments').delete().eq('report_id', id),
          supabase.from('council_member_referrals').delete().eq('urban_report_id', id),
        ]);
        const { error } = await supabase.from('urban_reports').delete().eq('id', id);
        if (error) throw error;
      } else if (type === 'transport') {
        await Promise.all([
          supabase.from('transport_report_responses').delete().eq('report_id', id),
          supabase.from('council_member_referrals').delete().eq('transport_report_id', id),
        ]);
        const { error } = await supabase.from('transport_reports').delete().eq('id', id);
        if (error) throw error;
      } else if (type === 'evaluation') {
        await supabase.from('council_member_referrals').delete().eq('service_rating_id', id);
        const { error } = await supabase.from('service_ratings').delete().eq('id', id);
        if (error) throw error;
      }

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

      toast.success('Relato excluído com sucesso');
      fetchManifests();
      fetchKPIs();
    } catch (error) {
      console.error('Error deleting manifest:', error);
      toast.error('Erro ao excluir relato');
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
    link.download = `relatos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Promise.all([
          supabase.from('export_logs').insert({
            user_id: user.id,
            export_type: typeFilter === 'all' ? 'all_manifests' : typeFilter,
            format: 'csv',
            status: 'completed',
            row_count: manifests.length,
            filters: {
              status: statusFilter,
              severity: severityFilter,
              type: typeFilter,
              search: debouncedSearchTerm,
              dateRange: dateRange.from || dateRange.to ? {
                from: dateRange.from?.toISOString(),
                to: dateRange.to?.toISOString()
              } : null
            },
            completed_at: new Date().toISOString()
          }),
          supabase.from('audit_logs').insert({
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
          })
        ]);
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
        .not('neighborhood', 'is', null)
        .limit(500);
      
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
    updateManifestCategory,
    updateBulkStatus,
    deleteManifest,
    deleteBulkManifests,
    exportToCSV,
    refetch: fetchManifests,
  };
};
