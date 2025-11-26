import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface EvaluationRequest {
  messages: Message[];
  serviceId: string;
  visitId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, serviceId }: EvaluationRequest = await req.json();
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
        temperature: 0.7,
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

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Análise básica de sentimento
    const lastUserMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    let sentiment = 'neutral';
    
    const negativeWords = ['ruim', 'péssimo', 'horrível', 'demora', 'sujo', 'mal atendido'];
    const positiveWords = ['bom', 'ótimo', 'excelente', 'rápido', 'limpo', 'bem atendido'];
    
    if (negativeWords.some(word => lastUserMessage.includes(word))) {
      sentiment = 'negative';
    } else if (positiveWords.some(word => lastUserMessage.includes(word))) {
      sentiment = 'positive';
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        sentiment,
        isComplete: messages.length >= 6, // Após 6 mensagens, considerar completo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-service:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
