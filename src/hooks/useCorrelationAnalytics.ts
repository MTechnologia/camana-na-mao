import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CorrelationData {
  categoryByRegion: { category: string; region: string; count: number }[];
  severityByCategory: { category: string; severity: string; count: number }[];
  categoryByDayOfWeek: { category: string; dayOfWeek: number; count: number }[];
  categoryByHour: { category: string; hour: number; count: number }[];
  riskByCategory: { category: string; risk_level: string; count: number }[];
}

interface CrossAnalysisStats {
  correlations: CorrelationData;
  topCriticalCategories: { category: string; criticalCount: number; percentage: number }[];
  hotspots: { region: string; category: string; count: number; trend: 'up' | 'down' | 'stable' }[];
  peakHours: { hour: number; count: number }[];
  weekdayDistribution: { day: string; count: number }[];
  isLoading: boolean;
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const EMPTY_CORRELATION_STATS: CrossAnalysisStats = {
  correlations: {
    categoryByRegion: [],
    severityByCategory: [],
    categoryByDayOfWeek: [],
    categoryByHour: [],
    riskByCategory: [],
  },
  topCriticalCategories: [],
  hotspots: [],
  peakHours: [],
  weekdayDistribution: [],
  isLoading: false,
};

export type UseCorrelationAnalyticsOptions = {
  /** Quando false, não dispara fetch (economiza rede em abas que não usam correlações). Default: true. */
  enabled?: boolean;
};

export const useCorrelationAnalytics = (opts?: UseCorrelationAnalyticsOptions) => {
  const enabled = opts?.enabled ?? true;

  const [stats, setStats] = useState<CrossAnalysisStats>(() => ({
    ...EMPTY_CORRELATION_STATS,
    isLoading: enabled,
  }));

  const fetchCorrelations = async () => {
    try {
      setStats(prev => ({ ...prev, isLoading: true }));
      
      // Fetch urban reports with relevant fields
      const { data: urbanReports, error: urbanError } = await supabase
        .from('urban_reports')
        .select('category, neighborhood, severity, risk_level, created_at')
        .limit(1000);

      if (urbanError) {
        console.error('Urban reports error:', urbanError);
      }

      // Fetch transport reports
      const { data: transportReports, error: transportError } = await supabase
        .from('transport_reports')
        .select('report_type, severity, created_at, location')
        .limit(1000);

      if (transportError) {
        console.error('Transport reports error:', transportError);
      }

      // Process correlations
      const categoryByRegion: Record<string, Record<string, number>> = {};
      const severityByCategory: Record<string, Record<string, number>> = {};
      const categoryByDayOfWeek: Record<string, Record<number, number>> = {};
      const categoryByHour: Record<string, Record<number, number>> = {};
      const riskByCategory: Record<string, Record<string, number>> = {};

      // Process urban reports
      (urbanReports || []).forEach(report => {
        const category = report.category || 'Não categorizado';
        const region = report.neighborhood || 'Não informado';
        const severity = report.severity || 'medium';
        const riskLevel = report.risk_level || 'none';
        const createdAt = new Date(report.created_at);
        const dayOfWeek = createdAt.getDay();
        const hour = createdAt.getHours();

        // Category by Region
        if (!categoryByRegion[category]) categoryByRegion[category] = {};
        categoryByRegion[category][region] = (categoryByRegion[category][region] || 0) + 1;

        // Severity by Category
        if (!severityByCategory[category]) severityByCategory[category] = {};
        severityByCategory[category][severity] = (severityByCategory[category][severity] || 0) + 1;

        // Category by Day of Week
        if (!categoryByDayOfWeek[category]) categoryByDayOfWeek[category] = {};
        categoryByDayOfWeek[category][dayOfWeek] = (categoryByDayOfWeek[category][dayOfWeek] || 0) + 1;

        // Category by Hour
        if (!categoryByHour[category]) categoryByHour[category] = {};
        categoryByHour[category][hour] = (categoryByHour[category][hour] || 0) + 1;

        // Risk by Category
        if (!riskByCategory[category]) riskByCategory[category] = {};
        riskByCategory[category][riskLevel] = (riskByCategory[category][riskLevel] || 0) + 1;
      });

      // Process transport reports
      (transportReports || []).forEach(report => {
        const category = `Transporte: ${report.report_type}`;
        const severity = report.severity || 'medium';
        const createdAt = new Date(report.created_at);
        const dayOfWeek = createdAt.getDay();
        const hour = createdAt.getHours();

        // Severity by Category
        if (!severityByCategory[category]) severityByCategory[category] = {};
        severityByCategory[category][severity] = (severityByCategory[category][severity] || 0) + 1;

        // Category by Day of Week
        if (!categoryByDayOfWeek[category]) categoryByDayOfWeek[category] = {};
        categoryByDayOfWeek[category][dayOfWeek] = (categoryByDayOfWeek[category][dayOfWeek] || 0) + 1;

        // Category by Hour
        if (!categoryByHour[category]) categoryByHour[category] = {};
        categoryByHour[category][hour] = (categoryByHour[category][hour] || 0) + 1;
      });

      // Transform to array format
      const categoryByRegionArray = Object.entries(categoryByRegion).flatMap(([category, regions]) =>
        Object.entries(regions).map(([region, count]) => ({ category, region, count }))
      );

      const severityByCategoryArray = Object.entries(severityByCategory).flatMap(([category, severities]) =>
        Object.entries(severities).map(([severity, count]) => ({ category, severity, count }))
      );

      const categoryByDayOfWeekArray = Object.entries(categoryByDayOfWeek).flatMap(([category, days]) =>
        Object.entries(days).map(([day, count]) => ({ 
          category, 
          dayOfWeek: parseInt(day), 
          count 
        }))
      );

      const categoryByHourArray = Object.entries(categoryByHour).flatMap(([category, hours]) =>
        Object.entries(hours).map(([hour, count]) => ({ 
          category, 
          hour: parseInt(hour), 
          count 
        }))
      );

      const riskByCategoryArray = Object.entries(riskByCategory).flatMap(([category, risks]) =>
        Object.entries(risks).map(([risk_level, count]) => ({ category, risk_level, count }))
      );

      // Calculate top critical categories
      const criticalCounts: Record<string, number> = {};
      const totalCounts: Record<string, number> = {};
      
      severityByCategoryArray.forEach(item => {
        if (!totalCounts[item.category]) totalCounts[item.category] = 0;
        totalCounts[item.category] += item.count;
        
        if (item.severity === 'critical' || item.severity === 'high') {
          if (!criticalCounts[item.category]) criticalCounts[item.category] = 0;
          criticalCounts[item.category] += item.count;
        }
      });

      const topCriticalCategories = Object.entries(criticalCounts)
        .map(([category, criticalCount]) => ({
          category,
          criticalCount,
          percentage: totalCounts[category] > 0 
            ? Math.round((criticalCount / totalCounts[category]) * 100) 
            : 0
        }))
        .sort((a, b) => b.criticalCount - a.criticalCount)
        .slice(0, 5);

      // Calculate hotspots (top category-region combinations)
      const hotspots = categoryByRegionArray
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => ({
          ...item,
          trend: 'stable' as const // Would need historical data for real trend
        }));

      // Calculate peak hours
      const hourCounts: Record<number, number> = {};
      categoryByHourArray.forEach(item => {
        hourCounts[item.hour] = (hourCounts[item.hour] || 0) + item.count;
      });
      
      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count);

      // Calculate weekday distribution
      const weekdayCounts: Record<number, number> = {};
      categoryByDayOfWeekArray.forEach(item => {
        weekdayCounts[item.dayOfWeek] = (weekdayCounts[item.dayOfWeek] || 0) + item.count;
      });

      const weekdayDistribution = DAY_NAMES.map((day, index) => ({
        day,
        count: weekdayCounts[index] || 0
      }));

      setStats({
        correlations: {
          categoryByRegion: categoryByRegionArray,
          severityByCategory: severityByCategoryArray,
          categoryByDayOfWeek: categoryByDayOfWeekArray,
          categoryByHour: categoryByHourArray,
          riskByCategory: riskByCategoryArray,
        },
        topCriticalCategories,
        hotspots,
        peakHours,
        weekdayDistribution,
        isLoading: false,
      });

    } catch (error) {
      console.error('Error fetching correlations:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (!enabled) {
      setStats((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    void fetchCorrelations();
  }, [enabled]);

  return stats;
};
