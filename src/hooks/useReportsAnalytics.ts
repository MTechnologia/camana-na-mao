import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DemographicData } from '@/components/analytics/DemographicsPieChart';
import type { FunnelStep } from '@/components/analytics/EngagementFunnel';
import type { TopReport } from '@/components/analytics/TopReportsList';
import type { PatternAlert } from '@/components/analytics/PatternAlerts';
import type { WordData } from '@/components/analytics/WordCloud';

interface ReportsAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  severity?: string;
  status?: string;
  region?: string;
}

interface TimelineDataPoint {
  date: string;
  urban: number;
  transport: number;
  total: number;
}

interface ReportsAnalyticsStats {
  // Geral
  total: number;
  urban: number;
  transport: number;
  pending: number;
  resolved: number;
  critical: number;
  trend: number;
  
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
    topReports: TopReport[];
    conversionFunnel: FunnelStep[];
  };
  
  // Criticidade
  criticality: {
    criticalScore: number;
    bySeverity: { severity: string; count: number; percentage: number }[];
    patterns: PatternAlert[];
    criticalPendingReports: any[];
  };
}

export const useReportsAnalytics = (filters: ReportsAnalyticsFilters = {}) => {
  const [stats, setStats] = useState<ReportsAnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Fetch urban reports
      let urbanQuery = supabase
        .from('urban_reports')
        .select(`
          *,
          urban_report_likes(count),
          urban_report_comments(count)
        `);

      if (filters.startDate) urbanQuery = urbanQuery.gte('created_at', filters.startDate);
      if (filters.endDate) urbanQuery = urbanQuery.lte('created_at', filters.endDate);
      if (filters.category) urbanQuery = urbanQuery.eq('category', filters.category);
      if (filters.severity) urbanQuery = urbanQuery.eq('severity', filters.severity);
      if (filters.status) urbanQuery = urbanQuery.eq('status', filters.status);

      const { data: urbanReports } = await urbanQuery;

      // Fetch transport reports
      let transportQuery = supabase
        .from('transport_reports')
        .select('*');

      if (filters.startDate) transportQuery = transportQuery.gte('created_at', filters.startDate);
      if (filters.endDate) transportQuery = transportQuery.lte('created_at', filters.endDate);
      if (filters.severity) transportQuery = transportQuery.eq('severity', filters.severity);
      if (filters.status) transportQuery = transportQuery.eq('status', filters.status);

      const { data: transportReports } = await transportQuery;

      const urbanCount = urbanReports?.length || 0;
      const transportCount = transportReports?.length || 0;
      const total = urbanCount + transportCount;

      // Calculate status distribution
      const statusCounts = new Map<string, number>();
      [...(urbanReports || []), ...(transportReports || [])].forEach(report => {
        const status = report.status || 'pending';
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });

      const byStatus = [
        { status: 'Pendente', count: statusCounts.get('pending') || 0, color: 'hsl(var(--chart-2))' },
        { status: 'Em Análise', count: statusCounts.get('in_progress') || 0, color: 'hsl(var(--chart-3))' },
        { status: 'Resolvido', count: statusCounts.get('resolved') || 0, color: 'hsl(var(--chart-1))' },
        { status: 'Rejeitado', count: statusCounts.get('rejected') || 0, color: 'hsl(var(--chart-5))' },
      ];

      // Calculate categories
      const categoryCounts = new Map<string, number>();
      (urbanReports || []).forEach(report => {
        const category = report.category || 'Outros';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });

      const categories = Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate severity
      const severityCounts = new Map<string, number>();
      [...(urbanReports || []), ...(transportReports || [])].forEach(report => {
        const severity = report.severity || 'medium';
        severityCounts.set(severity, (severityCounts.get(severity) || 0) + 1);
      });

      const critical = severityCounts.get('critical') || 0;
      const criticalScore = total > 0 ? (critical / total) * 100 : 0;

      const bySeverity = [
        { severity: 'Crítico', count: critical, percentage: criticalScore },
        { severity: 'Alto', count: severityCounts.get('high') || 0, percentage: total > 0 ? ((severityCounts.get('high') || 0) / total) * 100 : 0 },
        { severity: 'Médio', count: severityCounts.get('medium') || 0, percentage: total > 0 ? ((severityCounts.get('medium') || 0) / total) * 100 : 0 },
        { severity: 'Baixo', count: severityCounts.get('low') || 0, percentage: total > 0 ? ((severityCounts.get('low') || 0) / total) * 100 : 0 },
      ];

      // Calculate engagement metrics
      const totalLikes = (urbanReports || []).reduce((sum, report: any) => 
        sum + (report.urban_report_likes?.[0]?.count || 0), 0);
      const totalComments = (urbanReports || []).reduce((sum, report: any) => 
        sum + (report.urban_report_comments?.[0]?.count || 0), 0);

      // Create top reports
      const topReports: TopReport[] = (urbanReports || [])
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

      // Create funnel
      const withInteraction = (urbanReports || []).filter((r: any) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0 || (r.urban_report_comments?.[0]?.count || 0) > 0
      ).length;
      const withLikes = (urbanReports || []).filter((r: any) => 
        (r.urban_report_likes?.[0]?.count || 0) > 0
      ).length;
      const resolved = statusCounts.get('resolved') || 0;

      const conversionFunnel: FunnelStep[] = [
        { label: 'Relatos Criados', count: total, percentage: 100 },
        { label: 'Com Interação', count: withInteraction, percentage: total > 0 ? (withInteraction / total) * 100 : 0 },
        { label: 'Apoiados', count: withLikes, percentage: total > 0 ? (withLikes / total) * 100 : 0 },
        { label: 'Resolvidos', count: resolved, percentage: total > 0 ? (resolved / total) * 100 : 0 },
      ];

      // Mock demographics (would need to join with user data in real implementation)
      const demographics = {
        byGender: [
          { label: 'Masculino', count: Math.floor(total * 0.45), percentage: 45 },
          { label: 'Feminino', count: Math.floor(total * 0.52), percentage: 52 },
          { label: 'Outro', count: Math.floor(total * 0.03), percentage: 3 },
        ],
        byRace: [
          { label: 'Branca', count: Math.floor(total * 0.42), percentage: 42 },
          { label: 'Parda', count: Math.floor(total * 0.48), percentage: 48 },
          { label: 'Preta', count: Math.floor(total * 0.08), percentage: 8 },
          { label: 'Amarela', count: Math.floor(total * 0.01), percentage: 1 },
          { label: 'Indígena', count: Math.floor(total * 0.01), percentage: 1 },
        ],
        bySocialClass: [
          { label: 'A', count: Math.floor(total * 0.05), percentage: 5 },
          { label: 'B', count: Math.floor(total * 0.28), percentage: 28 },
          { label: 'C', count: Math.floor(total * 0.45), percentage: 45 },
          { label: 'D', count: Math.floor(total * 0.18), percentage: 18 },
          { label: 'E', count: Math.floor(total * 0.04), percentage: 4 },
        ],
        byAgeGroup: [
          { label: '18-24', count: Math.floor(total * 0.09), percentage: 9 },
          { label: '25-34', count: Math.floor(total * 0.28), percentage: 28 },
          { label: '35-44', count: Math.floor(total * 0.25), percentage: 25 },
          { label: '45-54', count: Math.floor(total * 0.18), percentage: 18 },
          { label: '55-64', count: Math.floor(total * 0.12), percentage: 12 },
          { label: '65+', count: Math.floor(total * 0.08), percentage: 8 },
        ],
        byRegion: [
          { region: 'Norte', count: Math.floor(total * 0.19), sentiment: 65 },
          { region: 'Sul', count: Math.floor(total * 0.25), sentiment: 72 },
          { region: 'Leste', count: Math.floor(total * 0.37), sentiment: 38 },
          { region: 'Oeste', count: Math.floor(total * 0.14), sentiment: 81 },
          { region: 'Centro', count: Math.floor(total * 0.05), sentiment: 75 },
        ],
      };

      // Mock patterns
      const patterns: PatternAlert[] = critical > 5 ? [
        {
          id: '1',
          type: 'frequency',
          severity: 'critical',
          title: 'Alta frequência de relatos críticos',
          description: `${critical} relatos críticos detectados no período`,
          suggestedAction: 'Revisar prioridades e alocar recursos',
          count: critical,
          confidence: 92,
        },
      ] : [];

      setStats({
        total,
        urban: urbanCount,
        transport: transportCount,
        pending: statusCounts.get('pending') || 0,
        resolved: statusCounts.get('resolved') || 0,
        critical,
        trend: 12, // Mock
        timeline: [], // Would need time-series query
        byStatus,
        categories,
        demographics,
        engagement: {
          totalLikes,
          totalComments,
          avgLikesPerReport: total > 0 ? totalLikes / total : 0,
          avgCommentsPerReport: total > 0 ? totalComments / total : 0,
          topReports,
          conversionFunnel,
        },
        criticality: {
          criticalScore,
          bySeverity,
          patterns,
          criticalPendingReports: [], // Would need filtered query
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refresh: fetchAnalytics };
};
