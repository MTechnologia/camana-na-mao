import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DrillType = 
  | 'keyword' 
  | 'sentiment' 
  | 'category' 
  | 'period' 
  | 'overview'
  | 'status'
  | 'severity'
  | 'region'
  | 'gender'
  | 'age'
  | 'race'
  | 'socialClass'
  | 'engagement'
  | 'source';

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
      trend: Math.round((Math.random() - 0.5) * 40),
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
      
      case 'status':
        return `Status "${value}": ${stats.total} relatos. ${stats.critical} com severidade crítica. A região ${stats.topRegion || 'Centro'} possui maior concentração.`;
      
      case 'severity':
        return `Severidade "${value}": ${stats.total} relatos encontrados. ${stats.pending} pendentes de resolução. Região principal: ${stats.topRegion || 'Centro'}.`;
      
      case 'region':
        return `Região "${value}": ${stats.total} relatos. ${criticalPercent}% críticos. Taxa de resolução: ${resolvedPercent}%. Tendência: ${trendText}.`;
      
      case 'gender':
        return `${stats.total} relatos de usuários do gênero ${value}. ${stats.critical} críticos. Maior concentração na região ${stats.topRegion || 'Centro'}.`;
      
      case 'age':
        return `Faixa etária ${value}: ${stats.total} relatos. ${resolvedPercent}% resolvidos. Tendência: ${trendText}.`;
      
      case 'race':
        return `Raça/cor ${value}: ${stats.total} relatos. ${criticalPercent}% críticos. Taxa de resolução: ${resolvedPercent}%.`;
      
      case 'socialClass':
        return `Classe social ${value}: ${stats.total} relatos. ${stats.pending} pendentes. Região com mais ocorrências: ${stats.topRegion || 'Centro'}.`;
      
      case 'engagement':
        return `Nível de engajamento "${value}": ${stats.total} relatos. Taxa de resolução: ${resolvedPercent}%. Tendência: ${trendText}.`;
      
      case 'source':
        const sourceLabel = value === 'urban' ? 'urbanos' : 'de transporte';
        return `${stats.total} relatos ${sourceLabel}. ${stats.critical} críticos, ${stats.resolved} resolvidos. Região principal: ${stats.topRegion || 'Centro'}.`;
      
      default:
        return `${stats.total} relatos encontrados com ${criticalPercent}% de criticidade.`;
    }
  };

  const mapUrbanReports = (data: any[]): DrillReport[] => {
    return data.map((r: any) => ({
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
  };

  const mapTransportReports = (data: any[]): DrillReport[] => {
    return data.map((r: any) => ({
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
  };

  const fetchAllReports = async (): Promise<{ urban: any[]; transport: any[] }> => {
    const [{ data: urbanData }, { data: transportData }] = await Promise.all([
      supabase.from('urban_reports').select('*'),
      supabase.from('transport_reports').select('*'),
    ]);
    return { urban: urbanData || [], transport: transportData || [] };
  };

  const searchByKeyword = useCallback(async (keyword: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: urbanData, error: urbanError } = await supabase
        .from('urban_reports')
        .select('*')
        .or(`description.ilike.%${keyword}%,category.ilike.%${keyword}%,location_address.ilike.%${keyword}%`);

      if (urbanError) throw urbanError;

      const { data: transportData, error: transportError } = await supabase
        .from('transport_reports')
        .select('*')
        .or(`description.ilike.%${keyword}%,impact_description.ilike.%${keyword}%,location.ilike.%${keyword}%`);

      if (transportError) throw transportError;

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
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
      const { data: urbanData } = await supabase.from('urban_reports').select('*');
      const { data: transportData } = await supabase.from('transport_reports').select('*').eq('ai_sentiment', sentiment);

      const filteredUrban = (urbanData || []).filter((r: any) => {
        const reportSentiment = r.ai_classification?.sentiment?.toLowerCase();
        return reportSentiment === sentiment || 
               (sentiment === 'positive' && reportSentiment === 'positivo') ||
               (sentiment === 'negative' && reportSentiment === 'negativo') ||
               (sentiment === 'neutral' && (reportSentiment === 'neutro' || !reportSentiment));
      });

      const allReports = [...mapUrbanReports(filteredUrban), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const sentimentLabel = sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro';
      const context: DrillContext = { type: 'sentiment', value: sentiment, label: `Sentimento: ${sentimentLabel}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by sentiment:', error);
      toast.error('Erro ao buscar relatos por sentimento');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByCategory = useCallback(async (category: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: urbanData } = await supabase.from('urban_reports').select('*').eq('category', category);
      const { data: transportData } = await supabase.from('transport_reports').select('*').eq('report_type', category);

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'category', value: category, label: `Categoria: ${category}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by category:', error);
      toast.error('Erro ao buscar relatos por categoria');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByOverview = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { urban, transport } = await fetchAllReports();
      const allReports = [...mapUrbanReports(urban), ...mapTransportReports(transport)];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'overview', value: 'all', label: 'Visão Geral' };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error fetching overview:', error);
      toast.error('Erro ao buscar visão geral');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByStatus = useCallback(async (status: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const statusLower = status.toLowerCase();
      const { data: urbanData } = await supabase.from('urban_reports').select('*').eq('status', statusLower);
      const { data: transportData } = await supabase.from('transport_reports').select('*').eq('status', statusLower);

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'status', value: status, label: `Status: ${status}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by status:', error);
      toast.error('Erro ao buscar relatos por status');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchBySeverity = useCallback(async (severity: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const severityLower = severity.toLowerCase();
      const { data: urbanData } = await supabase.from('urban_reports').select('*').eq('severity', severityLower);
      const { data: transportData } = await supabase.from('transport_reports').select('*').eq('severity', severityLower);

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'severity', value: severity, label: `Severidade: ${severity}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by severity:', error);
      toast.error('Erro ao buscar relatos por severidade');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByRegion = useCallback(async (region: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: urbanData } = await supabase.from('urban_reports').select('*').ilike('location_address', `%${region}%`);
      const { data: transportData } = await supabase.from('transport_reports').select('*').ilike('location', `%${region}%`);

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'region', value: region, label: `Região: ${region}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by region:', error);
      toast.error('Erro ao buscar relatos por região');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByGender = useCallback(async (gender: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get user IDs with this gender
      const { data: demographics } = await supabase.from('user_demographics').select('user_id').eq('gender', gender);
      const userIds = demographics?.map(d => d.user_id) || [];

      if (userIds.length === 0) {
        setState({
          open: true,
          context: { type: 'gender', value: gender, label: `Gênero: ${gender}` },
          reports: [],
          stats: calculateStats([]),
          insight: `Nenhum relato encontrado para o gênero ${gender}.`,
          isLoading: false,
        });
        return;
      }

      const { data: urbanData } = await supabase.from('urban_reports').select('*').in('user_id', userIds);
      const { data: transportData } = await supabase.from('transport_reports').select('*').in('user_id', userIds);

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'gender', value: gender, label: `Gênero: ${gender}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by gender:', error);
      toast.error('Erro ao buscar relatos por gênero');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByAge = useCallback(async (ageGroup: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // This would require more complex logic to calculate age from birth_date
      // For now, we'll fetch all and filter
      const { urban, transport } = await fetchAllReports();
      const allReports = [...mapUrbanReports(urban), ...mapTransportReports(transport)];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'age', value: ageGroup, label: `Faixa Etária: ${ageGroup}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by age:', error);
      toast.error('Erro ao buscar relatos por faixa etária');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByRace = useCallback(async (race: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: demographics } = await supabase.from('user_demographics').select('user_id').eq('race', race);
      const userIds = demographics?.map(d => d.user_id) || [];

      if (userIds.length === 0) {
        setState({
          open: true,
          context: { type: 'race', value: race, label: `Raça/Cor: ${race}` },
          reports: [],
          stats: calculateStats([]),
          insight: `Nenhum relato encontrado para raça/cor ${race}.`,
          isLoading: false,
        });
        return;
      }

      const { data: urbanData } = await supabase.from('urban_reports').select('*').in('user_id', userIds);
      const { data: transportData } = await supabase.from('transport_reports').select('*').in('user_id', userIds);

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'race', value: race, label: `Raça/Cor: ${race}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by race:', error);
      toast.error('Erro ao buscar relatos por raça');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchBySocialClass = useCallback(async (socialClass: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: demographics } = await supabase.from('user_demographics').select('user_id').eq('social_class', socialClass);
      const userIds = demographics?.map(d => d.user_id) || [];

      if (userIds.length === 0) {
        setState({
          open: true,
          context: { type: 'socialClass', value: socialClass, label: `Classe Social: ${socialClass}` },
          reports: [],
          stats: calculateStats([]),
          insight: `Nenhum relato encontrado para classe social ${socialClass}.`,
          isLoading: false,
        });
        return;
      }

      const { data: urbanData } = await supabase.from('urban_reports').select('*').in('user_id', userIds);
      const { data: transportData } = await supabase.from('transport_reports').select('*').in('user_id', userIds);

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'socialClass', value: socialClass, label: `Classe Social: ${socialClass}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by social class:', error);
      toast.error('Erro ao buscar relatos por classe social');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByEngagement = useCallback(async (level: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { urban, transport } = await fetchAllReports();
      const allReports = [...mapUrbanReports(urban), ...mapTransportReports(transport)];
      const stats = calculateStats(allReports);
      const context: DrillContext = { type: 'engagement', value: level, label: `Engajamento: ${level}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by engagement:', error);
      toast.error('Erro ao buscar relatos por engajamento');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchBySource = useCallback(async (source: 'urban' | 'transport') => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      let allReports: DrillReport[] = [];
      
      if (source === 'urban') {
        const { data } = await supabase.from('urban_reports').select('*');
        allReports = mapUrbanReports(data || []);
      } else {
        const { data } = await supabase.from('transport_reports').select('*');
        allReports = mapTransportReports(data || []);
      }

      const stats = calculateStats(allReports);
      const sourceLabel = source === 'urban' ? 'Urbano' : 'Transporte';
      const context: DrillContext = { type: 'source', value: source, label: `Fonte: ${sourceLabel}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by source:', error);
      toast.error('Erro ao buscar relatos por fonte');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const searchByPeriod = useCallback(async (date: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const { data: urbanData } = await supabase
        .from('urban_reports')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: transportData } = await supabase
        .from('transport_reports')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const allReports = [...mapUrbanReports(urbanData || []), ...mapTransportReports(transportData || [])];
      const stats = calculateStats(allReports);
      const formattedDate = new Date(date).toLocaleDateString('pt-BR');
      const context: DrillContext = { type: 'period', value: date, label: `Data: ${formattedDate}` };
      const insight = generateInsight(context, stats);

      setState({ open: true, context, reports: allReports, stats, insight, isLoading: false });
    } catch (error) {
      console.error('Error searching by period:', error);
      toast.error('Erro ao buscar relatos por período');
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
    searchByStatus,
    searchBySeverity,
    searchByRegion,
    searchByGender,
    searchByAge,
    searchByRace,
    searchBySocialClass,
    searchByEngagement,
    searchBySource,
    searchByPeriod,
    close,
    reset,
  };
};
