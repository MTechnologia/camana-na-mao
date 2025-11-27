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
    const { messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é um assistente especializado em diagnóstico de problemas no transporte público de São Paulo.

Sua função é:
1. Coletar informações de forma empática e estruturada
2. Classificar o tipo de problema (atraso, lotação, segurança, acessibilidade, limpeza)
3. Avaliar a severidade do impacto
4. Detectar se o problema é recorrente
5. Sugerir encaminhamento apropriado

Perguntas obrigatórias:
- Qual linha de ônibus/metrô?
- Que tipo de problema você enfrentou?
- Quando isso aconteceu? (data e horário aproximado)
- Com que frequência isso ocorre?
- Como isso impactou sua rotina?

Mantenha tom acolhedor e profissional. Faça uma pergunta por vez.
Quando tiver todas as informações, resuma o relato e confirme com o usuário.`;

    // Realizar análise com IA (tool calling - não usa streaming)
    if (action === 'analyze') {
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
            ...messages,
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'classify_report',
                description: 'Classifica o relato de transporte com base nas informações coletadas',
                parameters: {
                  type: 'object',
                  properties: {
                    report_type: {
                      type: 'string',
                      enum: ['atraso', 'lotacao', 'seguranca', 'acessibilidade', 'limpeza', 'outro'],
                      description: 'Tipo do problema relatado'
                    },
                    severity: {
                      type: 'string',
                      enum: ['low', 'medium', 'high', 'critical'],
                      description: 'Gravidade do problema'
                    },
                    sentiment: {
                      type: 'string',
                      enum: ['positive', 'neutral', 'negative'],
                      description: 'Sentimento do relato'
                    },
                    is_recurrent: {
                      type: 'boolean',
                      description: 'Se o problema é recorrente'
                    },
                    suggested_action: {
                      type: 'string',
                      description: 'Ação sugerida'
                    }
                  },
                  required: ['report_type', 'severity', 'sentiment'],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: 'function', function: { name: 'classify_report' } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos na sua workspace do Lovable.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall && toolCall.function.name === 'classify_report') {
        const classification = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ classification }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: data.choices[0].message.content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos na sua workspace do Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
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
    console.error('Error in diagnose-transport function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
