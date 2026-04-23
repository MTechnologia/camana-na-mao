import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAiProviderConfig } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  reports: Array<{
    id: string;
    text: string;
  }>;
}

interface AnalysisResult {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // 0-100
  keywords: string[];
  category_inferred: string;
  urgency: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reports }: AnalysisRequest = await req.json();
    
    if (!reports || !Array.isArray(reports)) {
      throw new Error('Invalid request: reports array is required');
    }

    const {
      chatCompletionsModel,
      finalAiApiKey,
      finalAiBaseUrl,
    } = await resolveAiProviderConfig({ logPrefix: '[analyze-sentiment]' });
    
    if (!finalAiBaseUrl) {
      throw new Error('AI_CHAT_BASE_URL ou AI_BASE_URL not configured');
    }

    const results: AnalysisResult[] = [];

    // Process reports in batches
    for (const report of reports) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (finalAiApiKey) {
          headers['Authorization'] = `Bearer ${finalAiApiKey}`;
        }
        
        const apiUrl = `${finalAiBaseUrl.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: chatCompletionsModel,
            messages: [
              {
                role: 'system',
                content: `Você é um analisador de sentimento especializado em relatos cidadãos. 
                Analise o texto e retorne APENAS um JSON válido (sem markdown, sem explicações) com:
                - sentiment: "positive", "neutral" ou "negative"
                - score: número de 0 a 100 (0=muito negativo, 50=neutro, 100=muito positivo)
                - keywords: array com 3-5 palavras-chave principais
                - category_inferred: categoria inferida (saúde, transporte, educação, segurança, meio ambiente, infraestrutura, limpeza, iluminação, outros)
                - urgency: "low", "medium" ou "high"`
              },
              {
                role: 'user',
                content: `Analise este relato: "${report.text}"`
              }
            ],
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          console.error('AI API error:', response.status, await response.text());
          // Fallback to basic analysis
          results.push(fallbackAnalysis(report));
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          results.push(fallbackAnalysis(report));
          continue;
        }

        // Parse AI response (removing markdown if present)
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const analysis = JSON.parse(cleanContent);

        results.push({
          id: report.id,
          sentiment: analysis.sentiment || 'neutral',
          score: analysis.score || 50,
          keywords: analysis.keywords || [],
          category_inferred: analysis.category_inferred || 'outros',
          urgency: analysis.urgency || 'medium'
        });

      } catch (error) {
        console.error(`Error analyzing report ${report.id}:`, error);
        results.push(fallbackAnalysis(report));
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-sentiment function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function fallbackAnalysis(report: { id: string; text: string }): AnalysisResult {
  const text = report.text.toLowerCase();
  
  // Simple keyword-based sentiment analysis
  const positiveWords = ['bom', 'ótimo', 'excelente', 'melhor', 'resolvido', 'obrigado'];
  const negativeWords = ['ruim', 'péssimo', 'horrível', 'problema', 'buraco', 'sujo', 'quebrado'];
  
  let score = 50;
  positiveWords.forEach(word => {
    if (text.includes(word)) score += 10;
  });
  negativeWords.forEach(word => {
    if (text.includes(word)) score -= 10;
  });
  score = Math.max(0, Math.min(100, score));

  const sentiment = score > 60 ? 'positive' : score < 40 ? 'negative' : 'neutral';
  
  // Extract simple keywords
  const words = text.split(/\s+/).filter(w => w.length > 4);
  const keywords = [...new Set(words)].slice(0, 5);

  // Infer category
  let category = 'outros';
  if (text.includes('ônibus') || text.includes('transporte')) category = 'transporte';
  else if (text.includes('hospital') || text.includes('saúde')) category = 'saúde';
  else if (text.includes('escola') || text.includes('educação')) category = 'educação';
  else if (text.includes('buraco') || text.includes('calçada')) category = 'infraestrutura';

  return {
    id: report.id,
    sentiment,
    score,
    keywords,
    category_inferred: category,
    urgency: score < 30 ? 'high' : score < 60 ? 'medium' : 'low'
  };
}
