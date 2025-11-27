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

      const { data: urbanReports, error: urbanError, count: urbanCount } = await urbanQuery;
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

      const { data: transportReports, error: transportError, count: transportCount } = await transportQuery;
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

        // Extract keywords from description
        if (report.description) {
          const words = report.description
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 4);
          
          words.forEach(word => {
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

      // Generate AI insights
      const insights: AIInsight[] = generateInsights(byCategory, overallScore, total);

      setStats({
        overallScore,
        trend: 5, // Mock trend - would need historical data
        distribution: { positive, neutral, negative },
        total,
        byCategory,
        timeline: generateMockTimeline(),
        keywords,
        insights
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

  return insights;
}

function generateMockTimeline(): TimelineDataPoint[] {
  const days = 30;
  const data: TimelineDataPoint[] = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    const positive = Math.floor(Math.random() * 50) + 20;
    const negative = Math.floor(Math.random() * 30) + 10;
    const neutral = Math.floor(Math.random() * 40) + 15;
    const total = positive + negative + neutral;
    const score = Math.round((positive * 100 + neutral * 50) / total);
    
    data.push({
      date: dateStr,
      score,
      positive,
      neutral,
      negative,
      total
    });
  }
  
  return data;
}
