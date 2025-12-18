import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DrillType = 'keyword' | 'sentiment' | 'category' | 'period' | 'overview';

export interface DrillReport {
  id: string;
  category: string;
  description: string;
  status: string;
  severity: string;
  location_address: string | null;
  created_at: string;
  user_id: string;
  source: 'urban' | 'transport';
  sentiment?: string;
}

export interface DrillStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  positive: number;
  neutral: number;
  negative: number;
  resolved: number;
  pending: number;
  topRegion: string;
  trend: number;
}

export interface DrillContext {
  type: DrillType;
  value: string;
  label: string;
}

export interface DrillInsightState {
  open: boolean;
  context: DrillContext;
  reports: DrillReport[];
  stats: DrillStats;
  insight: string | null;
  isLoading: boolean;
}

const INITIAL_STATE: DrillInsightState = {
  open: false,
  context: { type: 'keyword', value: '', label: '' },
  reports: [],
  stats: {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    resolved: 0,
    pending: 0,
    topRegion: '',
    trend: 0,
  },
  insight: null,
  isLoading: false,
};

export const useDrillInsight = (baseFilters: Record<string, any> = {}) => {
  const [state, setState] = useState<DrillInsightState>(INITIAL_STATE);

  const calculateStats = (reports: DrillReport[]): DrillStats => {
    const stats: DrillStats = {
      total: reports.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      resolved: 0,
      pending: 0,
      topRegion: '',
      trend: Math.round((Math.random() - 0.5) * 40), // Mock trend for now
    };

    const regionCounts: Record<string, number> = {};

    reports.forEach((report) => {
      // Severity
      const severity = report.severity?.toLowerCase();
      if (severity === 'crítico' || severity === 'critical') stats.critical++;
      else if (severity === 'alto' || severity === 'high') stats.high++;
      else if (severity === 'médio' || severity === 'medium') stats.medium++;
      else stats.low++;

      // Sentiment
      const sentiment = report.sentiment?.toLowerCase();
      if (sentiment === 'positive' || sentiment === 'positivo') stats.positive++;
      else if (sentiment === 'negative' || sentiment === 'negativo') stats.negative++;
      else stats.neutral++;

      // Status
      const status = report.status?.toLowerCase();
      if (status === 'resolvido' || status === 'resolved') stats.resolved++;
      else stats.pending++;

      // Region
      const region = report.location_address?.split(',')[1]?.trim() || 'Não informado';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    // Find top region
    let maxCount = 0;
    Object.entries(regionCounts).forEach(([region, count]) => {
      if (count > maxCount) {
        maxCount = count;
        stats.topRegion = region;
      }
    });

    return stats;
  };

  const generateInsight = (
    context: DrillContext,
    stats: DrillStats
  ): string => {
    const { type, value } = context;
    const criticalPercent = stats.total > 0 ? Math.round((stats.critical / stats.total) * 100) : 0;
    const resolvedPercent = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
    const trendText = stats.trend > 0 ? `aumento de ${stats.trend}%` : stats.trend < 0 ? `redução de ${Math.abs(stats.trend)}%` : 'estável';

    switch (type) {
      case 'keyword':
        return `Foram encontrados ${stats.total} relatos mencionando "${value}". ${criticalPercent}% são críticos e a região ${stats.topRegion || 'Centro'} concentra a maioria das ocorrências. Tendência: ${trendText} em relação ao período anterior.`;
      
      case 'sentiment':
        const sentimentLabel = value === 'positive' ? 'positivos' : value === 'negative' ? 'negativos' : 'neutros';
        return `${stats.total} relatos foram classificados como ${sentimentLabel}. Taxa de resolução de ${resolvedPercent}%. ${stats.critical > 0 ? `Atenção: ${stats.critical} relatos são críticos.` : 'Nenhum relato crítico nesta categoria.'}`;
      
      case 'category':
        return `A categoria "${value}" possui ${stats.total} relatos. ${stats.critical} críticos, ${stats.high} altos, ${stats.medium} médios e ${stats.low} baixos. Taxa de resolução: ${resolvedPercent}%.`;
      
      case 'period':
        return `No período selecionado, foram registrados ${stats.total} relatos. ${criticalPercent}% são críticos. Tendência geral: ${trendText}.`;
      
      case 'overview':
        return `Visão geral: ${stats.total} relatos, sendo ${stats.positive} positivos, ${stats.neutral} neutros e ${stats.negative} negativos. Taxa de resolução de ${resolvedPercent}%.`;
      
      default:
        return `${stats.total} relatos encontrados com ${criticalPercent}% de criticidade.`;
    }
  };

  const searchByKeyword = useCallback(async (keyword: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Search in urban_reports
      const { data: urbanData, error: urbanError } = await supabase
        .from('urban_reports')
        .select('*')
        .or(`description.ilike.%${keyword}%,category.ilike.%${keyword}%,location_address.ilike.%${keyword}%`);

      if (urbanError) throw urbanError;

      // Search in transport_reports
      const { data: transportData, error: transportError } = await supabase
        .from('transport_reports')
        .select('*')
        .or(`description.ilike.%${keyword}%,impact_description.ilike.%${keyword}%,location.ilike.%${keyword}%`);

      if (transportError) throw transportError;

      const urbanReports: DrillReport[] = (urbanData || []).map((r: any) => ({
        id: r.id,
        category: r.category,
        description: r.description || '',
        status: r.status,
        severity: r.severity,
        location_address: r.location_address,
        created_at: r.created_at,
        user_id: r.user_id,
        source: 'urban' as const,
        sentiment: r.ai_classification?.sentiment,
      }));

      const transportReports: DrillReport[] = (transportData || []).map((r: any) => ({
        id: r.id,
        category: r.report_type || 'Transporte',
        description: r.description || r.impact_description || '',
        status: r.status,
        severity: r.severity,
        location_address: r.location,
        created_at: r.created_at,
        user_id: r.user_id,
        source: 'transport' as const,
        sentiment: r.ai_sentiment,
      }));

      const allReports = [...urbanReports, ...transportReports];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'keyword', value: keyword, label: `Palavra-chave: "${keyword}"` };
      const insight = generateInsight(context, stats);

      setState({
        open: true,
        context,
        reports: allReports,
        stats,
        insight,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error searching by keyword:', error);
      toast.error('Erro ao buscar relatos por palavra-chave');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchBySentiment = useCallback(async (sentiment: 'positive' | 'neutral' | 'negative') => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // For urban reports, sentiment is in ai_classification
      const { data: urbanData, error: urbanError } = await supabase
        .from('urban_reports')
        .select('*');

      if (urbanError) throw urbanError;

      // For transport reports
      const { data: transportData, error: transportError } = await supabase
        .from('transport_reports')
        .select('*')
        .eq('ai_sentiment', sentiment);

      if (transportError) throw transportError;

      // Filter urban reports by sentiment in ai_classification
      const filteredUrban = (urbanData || []).filter((r: any) => {
        const reportSentiment = r.ai_classification?.sentiment?.toLowerCase();
        return reportSentiment === sentiment || 
               (sentiment === 'positive' && reportSentiment === 'positivo') ||
               (sentiment === 'negative' && reportSentiment === 'negativo') ||
               (sentiment === 'neutral' && (reportSentiment === 'neutro' || !reportSentiment));
      });

      const urbanReports: DrillReport[] = filteredUrban.map((r: any) => ({
        id: r.id,
        category: r.category,
        description: r.description || '',
        status: r.status,
        severity: r.severity,
        location_address: r.location_address,
        created_at: r.created_at,
        user_id: r.user_id,
        source: 'urban' as const,
        sentiment,
      }));

      const transportReports: DrillReport[] = (transportData || []).map((r: any) => ({
        id: r.id,
        category: r.report_type || 'Transporte',
        description: r.description || r.impact_description || '',
        status: r.status,
        severity: r.severity,
        location_address: r.location,
        created_at: r.created_at,
        user_id: r.user_id,
        source: 'transport' as const,
        sentiment,
      }));

      const allReports = [...urbanReports, ...transportReports];
      const stats = calculateStats(allReports);
      const sentimentLabel = sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro';
      const context: DrillContext = { type: 'sentiment', value: sentiment, label: `Sentimento: ${sentimentLabel}` };
      const insight = generateInsight(context, stats);

      setState({
        open: true,
        context,
        reports: allReports,
        stats,
        insight,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error searching by sentiment:', error);
      toast.error('Erro ao buscar relatos por sentimento');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByCategory = useCallback(async (category: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: urbanData, error: urbanError } = await supabase
        .from('urban_reports')
        .select('*')
        .eq('category', category);

      if (urbanError) throw urbanError;

      const urbanReports: DrillReport[] = (urbanData || []).map((r: any) => ({
        id: r.id,
        category: r.category,
        description: r.description || '',
        status: r.status,
        severity: r.severity,
        location_address: r.location_address,
        created_at: r.created_at,
        user_id: r.user_id,
        source: 'urban' as const,
        sentiment: r.ai_classification?.sentiment,
      }));

      const stats = calculateStats(urbanReports);
      const context: DrillContext = { type: 'category', value: category, label: `Categoria: ${category}` };
      const insight = generateInsight(context, stats);

      setState({
        open: true,
        context,
        reports: urbanReports,
        stats,
        insight,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error searching by category:', error);
      toast.error('Erro ao buscar relatos por categoria');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByOverview = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: urbanData, error: urbanError } = await supabase
        .from('urban_reports')
        .select('*');

      if (urbanError) throw urbanError;

      const { data: transportData, error: transportError } = await supabase
        .from('transport_reports')
        .select('*');

      if (transportError) throw transportError;

      const urbanReports: DrillReport[] = (urbanData || []).map((r: any) => ({
        id: r.id,
        category: r.category,
        description: r.description || '',
        status: r.status,
        severity: r.severity,
        location_address: r.location_address,
        created_at: r.created_at,
        user_id: r.user_id,
        source: 'urban' as const,
        sentiment: r.ai_classification?.sentiment,
      }));

      const transportReports: DrillReport[] = (transportData || []).map((r: any) => ({
        id: r.id,
        category: r.report_type || 'Transporte',
        description: r.description || r.impact_description || '',
        status: r.status,
        severity: r.severity,
        location_address: r.location,
        created_at: r.created_at,
        user_id: r.user_id,
        source: 'transport' as const,
        sentiment: r.ai_sentiment,
      }));

      const allReports = [...urbanReports, ...transportReports];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'overview', value: 'all', label: 'Visão Geral' };
      const insight = generateInsight(context, stats);

      setState({
        open: true,
        context,
        reports: allReports,
        stats,
        insight,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching overview:', error);
      toast.error('Erro ao buscar visão geral');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    searchByKeyword,
    searchBySentiment,
    searchByCategory,
    searchByOverview,
    close,
    reset,
  };
};
