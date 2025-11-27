import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é um assistente de avaliação de serviços públicos de São Paulo.
    
Sua missão é conduzir uma conversa natural e empática para coletar:
1. Avaliação geral (1-5 estrelas)
2. Aspectos específicos (atendimento, tempo de espera, infraestrutura)
3. Comentários detalhados
4. Análise de sentimento

Regras importantes:
- Seja empático e educado
- Faça perguntas claras e diretas
- Analise o sentimento das respostas (positivo, neutro, negativo)
- Se a avaliação for negativa (≤2 estrelas), sugira encaminhar ao vereador responsável pela região
- Ao final, agradeça e pergunte se deseja receber atualizações sobre melhorias

Formato de resposta:
- Para cada resposta do usuário, analise e extraia informações relevantes
- Mantenha o tom conversacional e acolhedor
- Se detectar problema grave, mostre empatia e ofereça ajuda`;

    // Chat conversacional com STREAMING SSE
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos esgotados. Por favor, adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('AI Gateway error');
    }

    // Retorna streaming SSE diretamente
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error) {
    console.error('Error in evaluate-service:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
