import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DemographicData } from '@/components/analytics/DemographicsPieChart';
import type { FunnelStep } from '@/components/analytics/EngagementFunnel';
import type { TopReport } from '@/components/analytics/TopReportsList';
import type { PatternAlert } from '@/components/analytics/PatternAlerts';

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
    bySeverity: { severity: string; count: number; percentage: number; color?: string }[];
    patterns: PatternAlert[];
    criticalPendingReports: any[];
  };
}

export const useReportsAnalytics = (filters: ReportsAnalyticsFilters = {}) => {
  const [stats, setStats] = useState<ReportsAnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Serializar filters para comparação estável
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      if (isMounted) {
        await fetchAnalytics(isMounted);
      }
    };
    
    load();
    
    return () => { isMounted = false; };
  }, [filtersKey]);

  const fetchAnalytics = async (isMounted: boolean = true) => {
    try {
      if (!isMounted) return;
      setIsLoading(true);

      // Fetch urban reports with user demographics JOIN
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

      // Fetch user demographics for reports
      const userIds = [
        ...(urbanReports || []).map(r => r.user_id),
        ...(transportReports || []).map(r => r.user_id)
      ].filter(Boolean);
      
      const uniqueUserIds = [...new Set(userIds)];
      
      const { data: userDemographics } = await supabase
        .from('user_demographics')
        .select('*')
        .in('user_id', uniqueUserIds);

      // Create demographics map
      const demographicsMap = new Map(
        (userDemographics || []).map(d => [d.user_id, d])
      );

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
        { status: 'Pendente', count: statusCounts.get('pending') || 0, color: 'hsl(var(--chart-3))' },
        { status: 'Em Análise', count: statusCounts.get('in_progress') || 0, color: 'hsl(var(--chart-2))' },
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
        { severity: 'Crítico', count: critical, percentage: criticalScore, color: 'hsl(var(--chart-5))' },
        { severity: 'Alto', count: severityCounts.get('high') || 0, percentage: total > 0 ? ((severityCounts.get('high') || 0) / total) * 100 : 0, color: 'hsl(var(--chart-3))' },
        { severity: 'Médio', count: severityCounts.get('medium') || 0, percentage: total > 0 ? ((severityCounts.get('medium') || 0) / total) * 100 : 0, color: 'hsl(var(--chart-2))' },
        { severity: 'Baixo', count: severityCounts.get('low') || 0, percentage: total > 0 ? ((severityCounts.get('low') || 0) / total) * 100 : 0, color: 'hsl(var(--chart-1))' },
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
        { label: 'Relatos Criados', count: total, percentage: 100, color: 'hsl(var(--chart-2))' },
        { label: 'Com Interação', count: withInteraction, percentage: total > 0 ? (withInteraction / total) * 100 : 0, color: 'hsl(var(--chart-6))' },
        { label: 'Apoiados', count: withLikes, percentage: total > 0 ? (withLikes / total) * 100 : 0, color: 'hsl(var(--chart-3))' },
        { label: 'Resolvidos', count: resolved, percentage: total > 0 ? (resolved / total) * 100 : 0, color: 'hsl(var(--chart-1))' },
      ];

      // REAL: Demographics from user_demographics table
      const genderCounts = new Map<string, number>();
      const raceCounts = new Map<string, number>();
      const socialClassCounts = new Map<string, number>();
      const ageCounts = new Map<string, number>();
      const regionCounts = new Map<string, { count: number; sentiments: number[] }>();

      // Calculate age from birth_date
      const calculateAge = (birthDate: string | null): string => {
        if (!birthDate) return 'Não informado';
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        if (age < 18) return '< 18';
        if (age <= 24) return '18-24';
        if (age <= 34) return '25-34';
        if (age <= 44) return '35-44';
        if (age <= 54) return '45-54';
        if (age <= 64) return '55-64';
        return '65+';
      };

      // Process all reports for demographics
      [...(urbanReports || []), ...(transportReports || [])].forEach(report => {
        const userDemo = demographicsMap.get(report.user_id);
        
        // Gender
        const gender = userDemo?.gender || 'Não informado';
        genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
        
        // Race
        const race = userDemo?.race || 'Não informado';
        raceCounts.set(race, (raceCounts.get(race) || 0) + 1);
        
        // Social class
        const socialClass = userDemo?.social_class || 'Não informado';
        socialClassCounts.set(socialClass, (socialClassCounts.get(socialClass) || 0) + 1);
        
        // Age
        const ageGroup = calculateAge(userDemo?.birth_date || null);
        ageCounts.set(ageGroup, (ageCounts.get(ageGroup) || 0) + 1);

        // Region from neighborhood
        const region = (report as any).neighborhood || 'Não especificado';
        if (!regionCounts.has(region)) {
          regionCounts.set(region, { count: 0, sentiments: [] });
        }
        const regionStats = regionCounts.get(region)!;
        regionStats.count++;
        // Add sentiment score (simplified)
        regionStats.sentiments.push(50);
      });

      // Convert to arrays
      const byGender: DemographicData[] = Array.from(genderCounts.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }));

      const byRace: DemographicData[] = Array.from(raceCounts.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }));

      const bySocialClass: DemographicData[] = Array.from(socialClassCounts.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }));

      const byAgeGroup: DemographicData[] = Array.from(ageCounts.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }));

      const byRegion = Array.from(regionCounts.entries())
        .map(([region, data]) => ({
          region,
          count: data.count,
          sentiment: data.sentiments.length > 0 
            ? Math.round(data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length)
            : 50
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // REAL: Timeline from actual data
      const dateMap = new Map<string, { urban: number; transport: number }>();
      
      (urbanReports || []).forEach(report => {
        if (report.created_at) {
          const dateKey = new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { urban: 0, transport: 0 });
          }
          dateMap.get(dateKey)!.urban++;
        }
      });

      (transportReports || []).forEach(report => {
        if (report.created_at) {
          const dateKey = new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { urban: 0, transport: 0 });
          }
          dateMap.get(dateKey)!.transport++;
        }
      });

      const timeline: TimelineDataPoint[] = Array.from(dateMap.entries())
        .map(([date, counts]) => ({
          date,
          urban: counts.urban,
          transport: counts.transport,
          total: counts.urban + counts.transport
        }))
        .slice(-30);

      // REAL: Calculate trend
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const allReports = [...(urbanReports || []), ...(transportReports || [])];
      const currentPeriodCount = allReports.filter(r => 
        r.created_at && new Date(r.created_at) >= sevenDaysAgo
      ).length;
      
      const previousPeriodCount = allReports.filter(r => 
        r.created_at && new Date(r.created_at) >= fourteenDaysAgo && new Date(r.created_at) < sevenDaysAgo
      ).length;
      
      const trend = previousPeriodCount > 0 
        ? Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100)
        : 0;

      // Patterns based on real data
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

      // Check for category concentration
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

      setStats({
        total,
        urban: urbanCount,
        transport: transportCount,
        pending: statusCounts.get('pending') || 0,
        resolved: statusCounts.get('resolved') || 0,
        critical,
        trend,
        timeline,
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
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refresh: () => fetchAnalytics(true) };
};
