import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImpactFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
}

interface ImpactStats {
  // Risk Level Distribution
  byRiskLevel: { level: string; count: number; percentage: number; color: string }[];
  
  // Affected Scope Distribution
  byAffectedScope: { scope: string; count: number; percentage: number }[];
  
  // Total affected estimate
  totalAffectedEstimate: number;
  avgAffectedPerReport: number;
  
  // Risk types frequency
  riskTypesFrequency: { type: string; count: number }[];
  
  // Urgency reasons (for word cloud)
  urgencyKeywords: { text: string; count: number }[];
  
  // Category x Risk Level matrix
  categoryRiskMatrix: { category: string; critical: number; moderate: number; low: number; none: number }[];
  
  // Summary
  criticalCount: number;
  moderateCount: number;
  lowCount: number;
  noRiskCount: number;
  totalWithImpact: number;
}

export const useImpactAnalytics = (filters: ImpactFilters = {}) => {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchImpactAnalytics();
  }, [filters]);

  const fetchImpactAnalytics = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('urban_reports')
        .select('category, risk_level, risk_types, affected_scope, affected_estimate, urgency_reason');

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data: reports, error } = await query;

      if (error) throw error;

      const total = reports?.length || 0;
      
      // Risk Level Distribution
      const riskLevelCounts = new Map<string, number>();
      const affectedScopeCounts = new Map<string, number>();
      const riskTypesCount = new Map<string, number>();
      const categoryRiskMap = new Map<string, { critical: number; moderate: number; low: number; none: number }>();
      const urgencyWords = new Map<string, number>();
      
      let totalAffectedEstimate = 0;
      let reportsWithEstimate = 0;

      (reports || []).forEach(report => {
        // Risk Level
        const riskLevel = report.risk_level || 'none';
        riskLevelCounts.set(riskLevel, (riskLevelCounts.get(riskLevel) || 0) + 1);

        // Affected Scope
        const scope = report.affected_scope || 'individual';
        affectedScopeCounts.set(scope, (affectedScopeCounts.get(scope) || 0) + 1);

        // Affected Estimate
        if (report.affected_estimate) {
          totalAffectedEstimate += report.affected_estimate;
          reportsWithEstimate++;
        }

        // Risk Types
        if (report.risk_types && Array.isArray(report.risk_types)) {
          report.risk_types.forEach((type: string) => {
            riskTypesCount.set(type, (riskTypesCount.get(type) || 0) + 1);
          });
        }

        // Category x Risk Level Matrix
        const category = report.category || 'outros';
        if (!categoryRiskMap.has(category)) {
          categoryRiskMap.set(category, { critical: 0, moderate: 0, low: 0, none: 0 });
        }
        const catRisk = categoryRiskMap.get(category)!;
        if (riskLevel === 'critical') catRisk.critical++;
        else if (riskLevel === 'moderate') catRisk.moderate++;
        else if (riskLevel === 'low') catRisk.low++;
        else catRisk.none++;

        // Urgency Reason Keywords
        if (report.urgency_reason) {
          const words = report.urgency_reason
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 3);
          
          words.forEach((word: string) => {
            urgencyWords.set(word, (urgencyWords.get(word) || 0) + 1);
          });
        }
      });

      // Build stats
      const riskLevelColors: Record<string, string> = {
        critical: 'hsl(var(--chart-5))',
        moderate: 'hsl(var(--chart-3))',
        low: 'hsl(var(--chart-2))',
        none: 'hsl(var(--chart-1))'
      };

      const byRiskLevel = [
        { level: 'Crítico', count: riskLevelCounts.get('critical') || 0, percentage: total > 0 ? ((riskLevelCounts.get('critical') || 0) / total) * 100 : 0, color: riskLevelColors.critical },
        { level: 'Moderado', count: riskLevelCounts.get('moderate') || 0, percentage: total > 0 ? ((riskLevelCounts.get('moderate') || 0) / total) * 100 : 0, color: riskLevelColors.moderate },
        { level: 'Baixo', count: riskLevelCounts.get('low') || 0, percentage: total > 0 ? ((riskLevelCounts.get('low') || 0) / total) * 100 : 0, color: riskLevelColors.low },
        { level: 'Nenhum', count: riskLevelCounts.get('none') || 0, percentage: total > 0 ? ((riskLevelCounts.get('none') || 0) / total) * 100 : 0, color: riskLevelColors.none },
      ];

      const scopeLabels: Record<string, string> = {
        individual: 'Individual',
        street: 'Rua',
        neighborhood: 'Bairro',
        region: 'Região'
      };

      const byAffectedScope = Array.from(affectedScopeCounts.entries())
        .map(([scope, count]) => ({
          scope: scopeLabels[scope] || scope,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      const riskTypesFrequency = Array.from(riskTypesCount.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const urgencyKeywords = Array.from(urgencyWords.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const categoryRiskMatrix = Array.from(categoryRiskMap.entries())
        .map(([category, risks]) => ({
          category,
          ...risks
        }))
        .sort((a, b) => (b.critical + b.moderate) - (a.critical + a.moderate))
        .slice(0, 10);

      const totalWithImpact = (riskLevelCounts.get('critical') || 0) + 
                              (riskLevelCounts.get('moderate') || 0) + 
                              (riskLevelCounts.get('low') || 0);

      setStats({
        byRiskLevel,
        byAffectedScope,
        totalAffectedEstimate,
        avgAffectedPerReport: reportsWithEstimate > 0 ? totalAffectedEstimate / reportsWithEstimate : 0,
        riskTypesFrequency,
        urgencyKeywords,
        categoryRiskMatrix,
        criticalCount: riskLevelCounts.get('critical') || 0,
        moderateCount: riskLevelCounts.get('moderate') || 0,
        lowCount: riskLevelCounts.get('low') || 0,
        noRiskCount: riskLevelCounts.get('none') || 0,
        totalWithImpact
      });
    } catch (error) {
      console.error('Error fetching impact analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refresh: fetchImpactAnalytics };
};
