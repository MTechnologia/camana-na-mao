import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WordData } from '@/components/analytics/WordCloud';
import type { DriverData } from '@/components/analytics/SentimentDrivers';
import type { AIInsight } from '@/components/analytics/AIInsightsCard';

interface SentimentFilters {
  startDate?: string;
  endDate?: string;
  region?: string;
  category?: string;
  severity?: string;
}

interface TimelineDataPoint {
  date: string;
  score: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface SentimentStats {
  overallScore: number;
  trend: number;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  total: number;
  byCategory: DriverData[];
  timeline: TimelineDataPoint[];
  keywords: WordData[];
  insights: AIInsight[];
  byRegion: { region: string; count: number; sentiment: number }[];
}

export const useSentimentAnalytics = (filters: SentimentFilters = {}) => {
  const [stats, setStats] = useState<SentimentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const getSentimentScore = (sentiment: string | null): number => {
    if (!sentiment) return 50;
    const lower = sentiment.toLowerCase();
    if (lower.includes('positive') || lower.includes('positivo')) return 80;
    if (lower.includes('negative') || lower.includes('negativo')) return 20;
    return 50;
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      // Buscar urban reports
      let urbanQuery = supabase
        .from('urban_reports')
        .select('*', { count: 'exact' });

      if (filters.startDate) {
        urbanQuery = urbanQuery.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        urbanQuery = urbanQuery.lte('created_at', filters.endDate);
      }
      if (filters.category) {
        urbanQuery = urbanQuery.eq('category', filters.category);
      }
      if (filters.severity) {
        urbanQuery = urbanQuery.eq('severity', filters.severity);
      }

      const { data: urbanReports, error: urbanError } = await urbanQuery;
      if (urbanError) throw urbanError;

      // Buscar transport reports
      let transportQuery = supabase
        .from('transport_reports')
        .select('*', { count: 'exact' });

      if (filters.startDate) {
        transportQuery = transportQuery.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        transportQuery = transportQuery.lte('created_at', filters.endDate);
      }
      if (filters.severity) {
        transportQuery = transportQuery.eq('severity', filters.severity);
      }

      const { data: transportReports, error: transportError } = await transportQuery;
      if (transportError) throw transportError;

      // Calcular estatísticas
      const allReports = [
        ...(urbanReports || []).map(r => {
          const classification = r.ai_classification as any;
          return {
            ...r, 
            sentiment: classification?.sentiment || 'neutral',
            category: r.category,
            type: 'urban'
          };
        }),
        ...(transportReports || []).map(r => ({ 
          ...r, 
          sentiment: r.ai_sentiment || 'neutral',
          category: r.ai_category || r.report_type || 'transporte',
          type: 'transport'
        }))
      ];

      const total = allReports.length;
      let positive = 0, neutral = 0, negative = 0;
      const categoryMap = new Map<string, { total: number; sentiment: number[] }>();
      const keywordsMap = new Map<string, { count: number; sentiment: string }>();
      const regionMap = new Map<string, { count: number; sentiments: number[] }>();
      const dateMap = new Map<string, { positive: number; neutral: number; negative: number; total: number }>();

      allReports.forEach(report => {
        const sentiment = report.sentiment?.toLowerCase() || 'neutral';
        
        if (sentiment.includes('positive') || sentiment.includes('positivo')) {
          positive++;
        } else if (sentiment.includes('negative') || sentiment.includes('negativo')) {
          negative++;
        } else {
          neutral++;
        }

        // Category stats
        const category = report.category || 'outros';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { total: 0, sentiment: [] });
        }
        const catStats = categoryMap.get(category)!;
        catStats.total++;
        catStats.sentiment.push(getSentimentScore(report.sentiment));

        // REAL: Region stats from neighborhood
        const region = (report as any).neighborhood || 'Não especificado';
        if (!regionMap.has(region)) {
          regionMap.set(region, { count: 0, sentiments: [] });
        }
        const regionStats = regionMap.get(region)!;
        regionStats.count++;
        regionStats.sentiments.push(getSentimentScore(report.sentiment));

        // REAL: Timeline from created_at
        const createdAt = report.created_at;
        if (createdAt) {
          const dateKey = new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { positive: 0, neutral: 0, negative: 0, total: 0 });
          }
          const dayStats = dateMap.get(dateKey)!;
          dayStats.total++;
          if (sentiment.includes('positive') || sentiment.includes('positivo')) {
            dayStats.positive++;
          } else if (sentiment.includes('negative') || sentiment.includes('negativo')) {
            dayStats.negative++;
          } else {
            dayStats.neutral++;
          }
        }

        // Extract keywords from description
        if (report.description) {
          const words = report.description
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 4);
          
          words.forEach((word: string) => {
            if (!keywordsMap.has(word)) {
              keywordsMap.set(word, { count: 0, sentiment: 'neutral' });
            }
            const kw = keywordsMap.get(word)!;
            kw.count++;
            kw.sentiment = sentiment;
          });
        }
      });

      const overallScore = total > 0 
        ? Math.round(((positive * 100 + neutral * 50) / total))
        : 50;

      // REAL: Calculate trend comparing current period vs previous period
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const currentPeriodReports = allReports.filter(r => 
        r.created_at && new Date(r.created_at) >= sevenDaysAgo
      ).length;
      
      const previousPeriodReports = allReports.filter(r => 
        r.created_at && new Date(r.created_at) >= fourteenDaysAgo && new Date(r.created_at) < sevenDaysAgo
      ).length;
      
      const trend = previousPeriodReports > 0 
        ? Math.round(((currentPeriodReports - previousPeriodReports) / previousPeriodReports) * 100)
        : 0;

      // Generate category drivers
      const byCategory: DriverData[] = Array.from(categoryMap.entries()).map(([category, data]) => {
        const avgSentiment = data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length;
        const change = avgSentiment - 50;
        const icon = getCategoryIcon(category);
        const impact = Math.abs(change) > 30 ? 'high' : Math.abs(change) > 15 ? 'medium' : 'low';

        return {
          category,
          icon,
          change: Math.round(change),
          impact,
          total: data.total
        };
      });

      // Top keywords
      const keywords: WordData[] = Array.from(keywordsMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 30)
        .map(([text, data]) => ({
          text,
          count: data.count,
          sentiment: data.sentiment as 'positive' | 'neutral' | 'negative'
        }));

      // REAL: Timeline from actual data
      const timeline: TimelineDataPoint[] = Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          score: data.total > 0 ? Math.round((data.positive * 100 + data.neutral * 50) / data.total) : 50,
          positive: data.positive,
          neutral: data.neutral,
          negative: data.negative,
          total: data.total
        }))
        .slice(-30); // Last 30 days

      // REAL: Region stats from actual neighborhood data
      const byRegion = Array.from(regionMap.entries())
        .map(([region, data]) => ({
          region,
          count: data.count,
          sentiment: data.sentiments.length > 0 
            ? Math.round(data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length)
            : 50
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 regions

      // Generate AI insights
      const insights: AIInsight[] = generateInsights(byCategory, overallScore, total);

      setStats({
        overallScore,
        trend,
        distribution: { positive, neutral, negative },
        total,
        byCategory,
        timeline,
        keywords,
        insights,
        byRegion
      });
    } catch (error: any) {
      console.error('Error loading sentiment analytics:', error);
      toast({
        title: 'Erro ao carregar análises',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refresh: loadAnalytics };
};

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'saúde': '🏥',
    'transporte': '🚌',
    'educação': '🎓',
    'segurança': '🛡️',
    'meio ambiente': '🌳',
    'infraestrutura': '🏗️',
    'limpeza': '🧹',
    'iluminação': '💡',
    'via_publica': '🛣️',
    'esgoto': '🚰',
    'area_verde': '🌲',
  };
  return icons[category.toLowerCase()] || '📋';
}

function generateInsights(drivers: DriverData[], score: number, total: number): AIInsight[] {
  const insights: AIInsight[] = [];

  // Alert for negative trends
  const highImpactNegative = drivers.filter(d => d.impact === 'high' && d.change < -20);
  if (highImpactNegative.length > 0) {
    insights.push({
      id: '1',
      type: 'alert',
      title: `Aumento significativo de relatos negativos`,
      description: `Detectamos ${highImpactNegative.length} categoria(s) com deterioração no sentimento.`,
      details: highImpactNegative.map(d => `${d.icon} ${d.category}: ${Math.abs(d.change)}% mais negativo (${d.total} relatos)`),
      suggestedAction: 'Revisar operações e implementar ações corretivas imediatas',
      confidence: 92,
      priority: 'high'
    });
  }

  // Opportunity for improvement
  const improving = drivers.filter(d => d.change > 15);
  if (improving.length > 0) {
    insights.push({
      id: '2',
      type: 'opportunity',
      title: 'Áreas com melhoria no sentimento',
      description: `${improving.length} categoria(s) apresentam tendência positiva.`,
      details: improving.map(d => `${d.icon} ${d.category}: +${d.change}%`),
      suggestedAction: 'Compartilhar boas práticas destas áreas com outras equipes',
      confidence: 85,
      priority: 'medium'
    });
  }

  // Total volume insight
  if (total > 50) {
    insights.push({
      id: '3',
      type: 'trend',
      title: 'Volume de contribuições significativo',
      description: `${total} contribuições no período permitem análises estatisticamente relevantes.`,
      details: [`Score geral de satisfação: ${score}%`],
      suggestedAction: 'Utilizar dados para planejamento de ações prioritárias',
      confidence: 95,
      priority: 'low'
    });
  }

  return insights;
}
