import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DemographicData } from '@/components/analytics/DemographicsPieChart';
import type { FunnelStep } from '@/components/analytics/EngagementFunnel';
import type { TopReport } from '@/components/analytics/TopReportsList';
import type { PatternAlert } from '@/components/analytics/PatternAlerts';
import {
  AGE_GROUP_LABELS,
  GENDER_LABELS,
  RACE_LABELS,
  SOCIAL_CLASS_LABELS,
} from "@/lib/demographicDrill";
import {
  buildNeighborhoodBreakdownFromUrbanReports,
  buildVolumeByZoneFromUrbanReports,
  buildTimelineFromUrbanReports,
  filterUrbanReportsByRegion,
  mapReportPatternsToAlerts,
  patternsFromCategories,
  type UrbanReportRow,
} from '@/lib/reportsAnalyticsAggregates';

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

export interface TimelineDataPoint {
  date: string;
  urban: number;
  transport: number;
  evaluation: number;
  total: number;
  /** Resolvidos no dia (relatos urbanos). */
  resolved?: number;
}

export interface ReportsAnalyticsStats {
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

  /** Volume por zona (relatos urbanos georreferenciados). */
  volumeByZone: { zone: string; count: number }[];

  /** Bairros por zona — drill territorial (detalhe por distrito). */
  neighborhoodBreakdown: { neighborhood: string; zone: string; count: number }[];
  
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
    criticalPendingReports: PatternAlert[];
  };
}

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
  volumeByZone: [],
  neighborhoodBreakdown: [],
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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

      const demographicsFromRpc = rpcResult as Record<string, unknown>;
      
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
          key,
          label: GENDER_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const byRace: DemographicData[] = Object.entries(demoData.race || {})
        .map(([key, count]) => ({
          key,
          label: RACE_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const bySocialClass: DemographicData[] = Object.entries(demoData.social_class || {})
        .map(([key, count]) => ({
          key,
          label: SOCIAL_CLASS_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      const byAgeGroup: DemographicData[] = Object.entries(demoData.age_group || {})
        .map(([key, count]) => ({
          key,
          label: AGE_GROUP_LABELS[key] || key,
          count: count as number,
          percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      // Processar categorias
      const categories = (demographicsFromRpc?.category_distribution || [])
        .map((c: { category?: string; count?: number }) => ({ category: c.category || 'Outros', count: c.count || 0 }));

      // Processar regiões
      const byRegion = (demographicsFromRpc?.neighborhood_distribution || [])
        .map((n: { neighborhood?: string; count?: number }) => ({
          region: n.neighborhood || 'Não especificado',
          count: n.count,
          sentiment: 50,
        }));

      // Processar status
      const statusData = demographicsFromRpc?.status_distribution || [];
      const statusMap = new Map<string, number>(
        statusData.map((s: { status?: string; count?: number }) => [s.status ?? '', Number(s.count) || 0])
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

      // Relatos urbanos no recorte (timeline, engajamento e padrões)
      let urbanReports: Record<string, unknown>[] = [];
      let timeline: TimelineDataPoint[] = [];
      let patternAlerts: PatternAlert[] = [];
      let volumeByZone: { zone: string; count: number }[] = [];
      let neighborhoodBreakdown: { neighborhood: string; zone: string; count: number }[] = [];

      try {
        let urbanQuery = supabase
          .from('urban_reports')
          .select(`
            id, description, category, location_address, status, created_at, severity, neighborhood,
            latitude, longitude,
            urban_report_likes(count),
            urban_report_comments(count)
          `)
          .neq('category', 'feedback_camara')
          .order('created_at', { ascending: true })
          .limit(3000);

        if (filters.startDate) {
          urbanQuery = urbanQuery.gte('created_at', `${filters.startDate}T00:00:00`);
        }
        if (filters.endDate) {
          urbanQuery = urbanQuery.lte('created_at', `${filters.endDate}T23:59:59`);
        }
        if (filters.category) {
          urbanQuery = urbanQuery.eq('category', filters.category);
        }

        const { data: urbanData } = await urbanQuery;
        urbanReports = urbanData || [];

        const urbanForTimeline = filterUrbanReportsByRegion(
          urbanReports as UrbanReportRow[],
          filters.region,
        );
        timeline = buildTimelineFromUrbanReports(urbanForTimeline);
        const urbanRows = urbanReports as UrbanReportRow[];
        volumeByZone = buildVolumeByZoneFromUrbanReports(urbanRows).map((r) => ({
          zone: r.zone,
          count: r.count,
        }));
        neighborhoodBreakdown = buildNeighborhoodBreakdownFromUrbanReports(urbanRows).map((r) => ({
          neighborhood: r.neighborhood,
          zone: r.zone,
          count: r.count,
        }));

        const { data: patternRows } = await supabase
          .from('report_patterns')
          .select(
            'id, pattern_type, description, occurrence_count, suggested_action, avg_severity',
          )
          .eq('status', 'active')
          .order('occurrence_count', { ascending: false })
          .limit(10);

        patternAlerts =
          patternRows && patternRows.length > 0
            ? mapReportPatternsToAlerts(patternRows)
            : patternsFromCategories(categories);
      } catch (err) {
        console.warn('Could not fetch urban reports timeline/patterns', err);
        patternAlerts = patternsFromCategories(categories);
      }

      const totalLikes = urbanReports.reduce((sum, r: Record<string, unknown>) => 
        sum + ((r.urban_report_likes as { count?: number }[])?.[0]?.count || 0), 0);
      const totalComments = urbanReports.reduce((sum, r: Record<string, unknown>) => 
        sum + (r.urban_report_comments?.[0]?.count || 0), 0);

      const topReports: TopReport[] = urbanReports
        .map((report: Record<string, unknown>) => ({
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

      const withInteraction = urbanReports.filter((r: Record<string, unknown>) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0 || (r.urban_report_comments?.[0]?.count || 0) > 0
      ).length;
      const withLikes = urbanReports.filter((r: Record<string, unknown>) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0
      ).length;

      const conversionFunnel: FunnelStep[] = [
        { label: 'Relatos Criados', count: total, percentage: 100, color: 'hsl(var(--chart-2))' },
        { label: 'Com Interação', count: withInteraction, percentage: total > 0 ? (withInteraction / total) * 100 : 0, color: 'hsl(var(--chart-6))' },
        { label: 'Apoiados', count: withLikes, percentage: total > 0 ? (withLikes / total) * 100 : 0, color: 'hsl(var(--chart-3))' },
        { label: 'Resolvidos', count: resolved, percentage: total > 0 ? (resolved / total) * 100 : 0, color: 'hsl(var(--chart-1))' },
      ];

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
          timeline,
          byStatus,
          categories,
          volumeByZone,
          neighborhoodBreakdown,
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
            patterns: patternAlerts,
            criticalPendingReports: [],
          },
        });
        setError(null);
        setLastUpdate(new Date());
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
  }, [
    filters.ageGroup,
    filters.gender,
    filters.race,
    filters.socialClass,
    filters.startDate,
    filters.endDate,
    filters.region,
    filters.category,
  ]);

  useEffect(() => {
    let isMounted = true;
    fetchAnalytics(isMounted);
    return () => { isMounted = false; };
  }, [filtersKey, fetchAnalytics]);

  return {
    stats,
    isLoading,
    error,
    lastUpdate,
    refresh: () => fetchAnalytics(true),
  };
};
