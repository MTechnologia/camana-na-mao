import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DemographicData } from '@/components/analytics/DemographicsPieChart';
import type { FunnelStep } from '@/components/analytics/EngagementFunnel';
import type { TopReport } from '@/components/analytics/TopReportsList';
import type { PatternAlert } from '@/components/analytics/PatternAlerts';

export interface ReportsAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  severity?: string;
  status?: string;
  region?: string;
  // Demographic filters
  gender?: string;
  race?: string;
  socialClass?: string;
  ageGroup?: string;
}

interface TimelineDataPoint {
  date: string;
  urban: number;
  transport: number;
  evaluation: number;
  total: number;
}

interface ReportsAnalyticsStats {
  // Geral
  total: number;
  urban: number;
  transport: number;
  evaluation: number;
  pending: number;
  resolved: number;
  critical: number;
  trend: number;
  
  // REAL Trends (calculated from data)
  resolvedTrend: number;
  criticalTrend: number;
  pendingTrend: number;
  
  // Temporal
  timeline: TimelineDataPoint[];
  
  // Status
  byStatus: { status: string; count: number; color: string }[];
  
  // Categorias
  categories: { category: string; count: number }[];
  
  // Demografia
  demographics: {
    byGender: DemographicData[];
    byRace: DemographicData[];
    bySocialClass: DemographicData[];
    byAgeGroup: DemographicData[];
    byRegion: { region: string; count: number; sentiment: number }[];
  };
  
  // Engajamento
  engagement: {
    totalLikes: number;
    totalComments: number;
    avgLikesPerReport: number;
    avgCommentsPerReport: number;
    likesTrend: number;
    commentsTrend: number;
    topReports: TopReport[];
    conversionFunnel: FunnelStep[];
  };
  
  // Criticidade
  criticality: {
    criticalScore: number;
    bySeverity: { severity: string; count: number; percentage: number; color?: string }[];
    patterns: PatternAlert[];
    criticalPendingReports: any[];
  };
}

// Mapeamento de labels para exibição
const GENDER_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  outro: 'Outro',
  prefiro_nao_dizer: 'Prefiro não dizer',
  not_informed: 'Não informado',
};

const RACE_LABELS: Record<string, string> = {
  branca: 'Branca',
  preta: 'Preta',
  parda: 'Parda',
  amarela: 'Amarela',
  indigena: 'Indígena',
  not_informed: 'Não informado',
};

const SOCIAL_CLASS_LABELS: Record<string, string> = {
  A: 'Classe A',
  B: 'Classe B',
  C: 'Classe C',
  D: 'Classe D',
  E: 'Classe E',
  not_informed: 'Não informado',
};

const AGE_GROUP_LABELS: Record<string, string> = {
  under_18: '< 18',
  '18_24': '18-24',
  '25_34': '25-34',
  '35_44': '35-44',
  '45_54': '45-54',
  '55_64': '55-64',
  '65_plus': '65+',
  not_informed: 'Não informado',
};

const emptyStats: ReportsAnalyticsStats = {
  total: 0,
  urban: 0,
  transport: 0,
  evaluation: 0,
  pending: 0,
  resolved: 0,
  critical: 0,
  trend: 0,
  resolvedTrend: 0,
  criticalTrend: 0,
  pendingTrend: 0,
  timeline: [],
  byStatus: [],
  categories: [],
  demographics: {
    byGender: [],
    byRace: [],
    bySocialClass: [],
    byAgeGroup: [],
    byRegion: [],
  },
  engagement: {
    totalLikes: 0,
    totalComments: 0,
    avgLikesPerReport: 0,
    avgCommentsPerReport: 0,
    likesTrend: 0,
    commentsTrend: 0,
    topReports: [],
    conversionFunnel: [],
  },
  criticality: {
    criticalScore: 0,
    bySeverity: [],
    patterns: [],
    criticalPendingReports: [],
  },
};

export const useReportsAnalytics = (filters: ReportsAnalyticsFilters = {}) => {
  const [stats, setStats] = useState<ReportsAnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serializar filters para comparação estável
  const filtersKey = JSON.stringify(filters);

  const fetchAnalytics = useCallback(async (isMounted: boolean = true) => {
    try {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);

      // Mapear filtros para o formato do banco
      const ageGroupMap: Record<string, string> = {
        '< 18': 'under_18',
        '18-24': '18_24',
        '25-34': '25_34',
        '35-44': '35_44',
        '45-54': '45_54',
        '55-64': '55_64',
        '65+': '65_plus',
        'Não informado': 'not_informed',
      };

      const mappedAgeGroup = filters.ageGroup 
        ? ageGroupMap[filters.ageGroup] || filters.ageGroup
        : null;

      const mappedGender = filters.gender === 'Não informado' 
        ? 'not_informed' 
        : filters.gender || null;

      const mappedRace = filters.race === 'Não informado' 
        ? 'not_informed' 
        : filters.race || null;

      const mappedSocialClass = filters.socialClass === 'Não informado' 
        ? 'not_informed' 
        : filters.socialClass || null;

      // Converter datas para ISO (TIMESTAMPTZ compatível)
      const startDateISO = filters.startDate ? new Date(filters.startDate).toISOString() : null;
      const endDateISO = filters.endDate ? new Date(filters.endDate).toISOString() : null;

      // Tentar buscar dados demográficos via função segura (SECURITY DEFINER)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('get_reports_with_demographics', {
        p_gender: mappedGender,
        p_race: mappedRace,
        p_social_class: mappedSocialClass,
        p_age_group: mappedAgeGroup,
        p_report_type: null,
        p_start_date: startDateISO,
        p_end_date: endDateISO,
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        if (isMounted) {
          setError('Não foi possível carregar os dados de análise.');
          setStats(emptyStats);
          setIsLoading(false);
        }
        return;
      }

      const demographicsFromRpc = rpcResult as any;
      
      // Usar dados da função segura
      const total = demographicsFromRpc?.total || 0;
      const urbanCount = demographicsFromRpc?.urban_count || 0;
      const transportCount = demographicsFromRpc?.transport_count || 0;
      const evaluationCount = demographicsFromRpc?.evaluation_count || 0;
      const critical = demographicsFromRpc?.critical_count || 0;
      const pending = demographicsFromRpc?.pending_count || 0;
      const resolved = demographicsFromRpc?.resolved_count || 0;
      
      // Processar demographics
      const demoData = demographicsFromRpc?.demographics || {};
      
      const byGender: DemographicData[] = Object.entries(demoData.gender || {})
        .map(([key, count]) => ({
          label: GENDER_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const byRace: DemographicData[] = Object.entries(demoData.race || {})
        .map(([key, count]) => ({
          label: RACE_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const bySocialClass: DemographicData[] = Object.entries(demoData.social_class || {})
        .map(([key, count]) => ({
          label: SOCIAL_CLASS_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const byAgeGroup: DemographicData[] = Object.entries(demoData.age_group || {})
        .map(([key, count]) => ({
          label: AGE_GROUP_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      // Processar categorias
      const categories = (demographicsFromRpc?.category_distribution || [])
        .map((c: any) => ({ category: c.category || 'Outros', count: c.count }));

      // Processar regiões
      const byRegion = (demographicsFromRpc?.neighborhood_distribution || [])
        .map((n: any) => ({
          region: n.neighborhood || 'Não especificado',
          count: n.count,
          sentiment: 50,
        }));

      // Processar status
      const statusData = demographicsFromRpc?.status_distribution || [];
      const statusMap = new Map<string, number>(
        statusData.map((s: any) => [s.status, Number(s.count) || 0])
      );
      
      const byStatus = [
        { status: 'Pendente', count: statusMap.get('pending') || 0, color: 'hsl(var(--chart-3))' },
        { status: 'Em Análise', count: statusMap.get('in_progress') || 0, color: 'hsl(var(--chart-2))' },
        { status: 'Resolvido', count: statusMap.get('resolved') || 0, color: 'hsl(var(--chart-1))' },
        { status: 'Rejeitado', count: statusMap.get('rejected') || 0, color: 'hsl(var(--chart-5))' },
      ];

      // Calcular severidade
      const criticalScore = total > 0 ? (critical / total) * 100 : 0;
      const bySeverity = [
        { severity: 'Crítico', count: critical, percentage: criticalScore, color: 'hsl(var(--chart-5))' },
        { severity: 'Alto', count: 0, percentage: 0, color: 'hsl(var(--chart-3))' },
        { severity: 'Médio', count: 0, percentage: 0, color: 'hsl(var(--chart-2))' },
        { severity: 'Baixo', count: 0, percentage: 0, color: 'hsl(var(--chart-1))' },
      ];

      // Buscar dados de engajamento separadamente (urban reports com likes/comments)
      let urbanReports: any[] = [];
      try {
        const { data: urbanData } = await supabase
          .from('urban_reports')
          .select(`
            id, description, category, location_address, status, created_at, severity,
            urban_report_likes(count),
            urban_report_comments(count)
          `)
          .limit(500);
        urbanReports = urbanData || [];
      } catch (err) {
        console.log('Could not fetch engagement data');
      }

      const totalLikes = urbanReports.reduce((sum, r: any) => 
        sum + (r.urban_report_likes?.[0]?.count || 0), 0);
      const totalComments = urbanReports.reduce((sum, r: any) => 
        sum + (r.urban_report_comments?.[0]?.count || 0), 0);

      const topReports: TopReport[] = urbanReports
        .map((report: any) => ({
          id: report.id,
          description: report.description || 'Sem descrição',
          category: report.category,
          location: report.location_address || 'Não especificado',
          likes: report.urban_report_likes?.[0]?.count || 0,
          comments: report.urban_report_comments?.[0]?.count || 0,
          status: report.status,
          created_at: report.created_at,
        }))
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 10);

      const withInteraction = urbanReports.filter((r: any) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0 || (r.urban_report_comments?.[0]?.count || 0) > 0
      ).length;
      const withLikes = urbanReports.filter((r: any) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0
      ).length;

      const conversionFunnel: FunnelStep[] = [
        { label: 'Relatos Criados', count: total, percentage: 100, color: 'hsl(var(--chart-2))' },
        { label: 'Com Interação', count: withInteraction, percentage: total > 0 ? (withInteraction / total) * 100 : 0, color: 'hsl(var(--chart-6))' },
        { label: 'Apoiados', count: withLikes, percentage: total > 0 ? (withLikes / total) * 100 : 0, color: 'hsl(var(--chart-3))' },
        { label: 'Resolvidos', count: resolved, percentage: total > 0 ? (resolved / total) * 100 : 0, color: 'hsl(var(--chart-1))' },
      ];

      // Padrões
      const patterns: PatternAlert[] = [];
      if (critical > 5) {
        patterns.push({
          id: '1',
          type: 'frequency',
          severity: 'critical',
          title: 'Alta frequência de relatos críticos',
          description: `${critical} relatos críticos detectados no período`,
          suggestedAction: 'Revisar prioridades e alocar recursos',
          count: critical,
          confidence: 92,
        });
      }

      const topCategory = categories[0];
      if (topCategory && topCategory.count > total * 0.4) {
        patterns.push({
          id: '2',
          type: 'location',
          severity: 'warning',
          title: `Concentração em ${topCategory.category}`,
          description: `${Math.round((topCategory.count / total) * 100)}% dos relatos são sobre ${topCategory.category}`,
          suggestedAction: 'Investigar causas e definir ações focadas',
          count: topCategory.count,
          confidence: 88,
        });
      }

      if (isMounted) {
        setStats({
          total,
          urban: urbanCount,
          transport: transportCount,
          evaluation: evaluationCount,
          pending,
          resolved,
          critical,
          trend: 0,
          resolvedTrend: 0,
          criticalTrend: 0,
          pendingTrend: 0,
          timeline: [],
          byStatus,
          categories,
          demographics: {
            byGender,
            byRace,
            bySocialClass,
            byAgeGroup,
            byRegion,
          },
          engagement: {
            totalLikes,
            totalComments,
            avgLikesPerReport: total > 0 ? totalLikes / total : 0,
            avgCommentsPerReport: total > 0 ? totalComments / total : 0,
            likesTrend: 0,
            commentsTrend: 0,
            topReports,
            conversionFunnel,
          },
          criticality: {
            criticalScore,
            bySeverity,
            patterns,
            criticalPendingReports: [],
          },
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      if (isMounted) {
        setError('Ocorreu um erro ao carregar os dados. Tente novamente.');
        setStats(emptyStats);
      }
    } finally {
      if (isMounted) setIsLoading(false);
    }
  }, [filters.ageGroup, filters.gender, filters.race, filters.socialClass, filters.startDate, filters.endDate]);

  useEffect(() => {
    let isMounted = true;
    fetchAnalytics(isMounted);
    return () => { isMounted = false; };
  }, [filtersKey, fetchAnalytics]);

  return { stats, isLoading, error, refresh: () => fetchAnalytics(true) };
};
