import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phrase-based patterns for high-confidence cross-journey detection
const PHRASE_PATTERNS: Record<string, string[]> = {
  transport: [
    'problema com ônibus', 'problema com onibus', 'atraso de metrô', 'atraso de metro',
    'linha de trem', 'ônibus lotado', 'onibus lotado', 'metrô cheio', 'metro cheio',
    'ônibus atrasado', 'onibus atrasado', 'metrô atrasado', 'metro atrasado'
  ],
  urban_report: [
    'buraco na rua', 'poste sem luz', 'lixo na calçada', 'esgoto aberto',
    'elogiar vereador', 'elogiar um vereador', 'reclamar da câmara', 'reclamar da camara',
    'sugestão para câmara', 'feedback sobre vereador', 'crítica ao vereador',
    'reclamação da câmara', 'elogio ao vereador', 'sugestão para vereador'
  ],
  general: [
    'como funciona a câmara', 'próxima audiência', 'proxima audiencia',
    'projeto de lei', 'quais comissões', 'agenda da câmara', 'notícias da câmara'
  ]
};

// Keyword-based patterns for fallback detection (excluding evaluate - current journey)
const INTENT_PATTERNS: Record<string, string[]> = {
  transport: [
    'ônibus', 'onibus', 'metrô', 'metro', 'trem', 'cptm', 'sptrans', 
    'lotação', 'lotacao', 'terminal', 'estação', 'bilhete único'
  ],
  urban_report: [
    'buraco', 'iluminação', 'iluminacao', 'poste', 'lixo', 'calçada', 'calcada', 
    'esgoto', 'semáforo', 'semaforo', 'asfalto', 'mato alto', 'árvore', 'arvore', 'entulho',
    'vereador', 'câmara', 'camara', 'reclamação', 'reclamacao', 'elogio'
  ],
  general: [
    'notícia', 'audiência pública', 'comissão permanente', 'legislativo', 
    'projeto de lei', 'pauta do dia', 'sessão plenária', 'votação'
  ]
};

function detectCrossIntent(message: string, currentJourney: string): { journey: string | null; confidence: number } {
  const lowerMessage = message.toLowerCase();
  
  // First: try phrase-based detection (higher confidence)
  for (const [journey, phrases] of Object.entries(PHRASE_PATTERNS)) {
    if (journey === currentJourney) continue;
    
    const phraseMatch = phrases.some(phrase => lowerMessage.includes(phrase));
    if (phraseMatch) {
      return { journey, confidence: 0.95 };
    }
  }
  
  // Fallback: keyword-based detection (need 2+ keywords)
  for (const [journey, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (journey === currentJourney) continue;
    
    const matches = keywords.filter(keyword => lowerMessage.includes(keyword));
    if (matches.length >= 2) {
      return { journey, confidence: 0.85 };
    }
  }
  
  return { journey: null, confidence: 0 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    // Detect cross-journey intent from last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const crossIntent = lastUserMessage ? detectCrossIntent(lastUserMessage.content, 'evaluate') : null;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const systemPrompt = `Você é o Assistente CMSP, assistente da Câmara Municipal de São Paulo, especializado em coletar avaliações de serviços públicos.

## 🎯 PROPÓSITO DESTA CONVERSA
Esta é uma jornada FOCADA para avaliar serviços públicos que o cidadão utilizou (UBS, escola, CEU, hospital, biblioteca, etc.).

## ✅ DADOS A COLETAR (Slot Filling)
1. **[SERVIÇO]** - Nome do serviço público utilizado (OBRIGATÓRIO)
2. **[TIPO]** - Tipo: ubs, school, ceu, hospital, library, sports_center, other (INFERIR)
3. **[NOTA]** - Avaliação de 1 a 5 estrelas (OBRIGATÓRIO)
4. **[COMENTÁRIO]** - Detalhes sobre a experiência (OBRIGATÓRIO)
5. **[SENTIMENTO]** - Positive, neutral, negative (INFERIR do tom)

## 🗣️ FLUXO DA CONVERSA
1. Pergunte qual serviço público o cidadão utilizou
2. Peça uma nota de 1 a 5 estrelas
3. Peça detalhes: O que foi bom? O que poderia melhorar?
4. Confirme as informações antes de salvar
5. Após confirmação, use create_service_rating

## ⭐ COMPORTAMENTO ESPECIAL PARA AVALIAÇÕES NEGATIVAS
Se a nota for ≤ 2 estrelas:
→ Mostre empatia extra: "Lamento que sua experiência não tenha sido boa..."
→ Pergunte se deseja encaminhar a um vereador da comissão de saúde/educação
→ "Gostaria de encaminhar esse feedback para um vereador acompanhar?"

## 🚫 GUARDRAILS DE ESCOPO (CRÍTICO)

### SE O USUÁRIO SAIR DO TEMA:
Se o cidadão perguntar sobre transporte público, ônibus, metrô:
→ "Isso é mais um assunto de transporte! Temos um canal específico para problemas com ônibus e metrô. Quer que eu te direcione? Ou podemos continuar com sua avaliação de serviço."

Se perguntar sobre buracos, iluminação, problemas urbanos:
→ "Esse tipo de problema é diferente - seria um relato urbano. Posso te direcionar para lá se quiser. Ou se você quer avaliar o atendimento em algum serviço público, estou aqui!"

Se perguntar sobre notícias, audiências, vereadores, legislação:
→ "Boa pergunta! Isso está fora do que consigo ajudar aqui na avaliação de serviços. O assistente geral pode te orientar sobre a Câmara. Quer voltar ao início?"

### SE O USUÁRIO QUISER SAIR:
Se disser "quero falar sobre outra coisa", "cancelar", "sair":
→ "Sem problemas! Pode voltar quando quiser avaliar um serviço. Só clicar na setinha ← no topo. Até mais! 👋"

## ⚠️ REGRAS IMPORTANTES
- Seja empática e educada
- Faça perguntas claras e diretas, UMA por vez
- Analise o sentimento das respostas automaticamente
- SEMPRE confirme com o usuário antes de salvar
- Ao final, agradeça pela participação
- NÃO invente funcionalidades que não existem`;

    // Chat conversacional com STREAMING SSE e tool calling
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_service_rating',
              description: 'Cria uma avaliação de serviço público quando todas as informações foram coletadas e confirmadas pelo usuário',
              parameters: {
                type: 'object',
                properties: {
                  service_name: {
                    type: 'string',
                    description: 'Nome do serviço público avaliado'
                  },
                  service_type: {
                    type: 'string',
                    enum: ['ubs', 'school', 'ceu', 'hospital', 'library', 'sports_center', 'other'],
                    description: 'Tipo do serviço público'
                  },
                  rating_stars: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                    description: 'Nota de 1 a 5 estrelas'
                  },
                  rating_text: {
                    type: 'string',
                    description: 'Comentário detalhado da avaliação'
                  },
                  sentiment: {
                    type: 'string',
                    enum: ['positive', 'neutral', 'negative'],
                    description: 'Sentimento geral da avaliação'
                  }
                },
                required: ['service_name', 'service_type', 'rating_stars', 'rating_text', 'sentiment'],
                additionalProperties: false
              }
            }
          }
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

    // Process streaming response with tool call detection
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let fullContent = '';
    let toolCallData: any = null;
    let toolCallArgs = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Inject intent marker first if cross-intent detected
          if (crossIntent?.journey && crossIntent.confidence >= 0.6) {
            const intentMarker = `data: ${JSON.stringify({ intent_detected: true, journey: crossIntent.journey, confidence: crossIntent.confidence })}\n\n`;
            controller.enqueue(encoder.encode(intentMarker));
          }
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Check if we have a complete tool call to execute
                  if (toolCallData && toolCallArgs && userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                    try {
                      const args = JSON.parse(toolCallArgs);
                      console.log('Executing tool call create_service_rating:', args);
                      
                      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
                      
                      // Try to find service in public_services table
                      let serviceId: string | null = null;
                      const { data: serviceData } = await supabase
                        .from('public_services')
                        .select('id')
                        .or(`name.ilike.%${args.service_name}%,service_type.eq.${args.service_type}`)
                        .limit(1)
                        .single();
                      
                      if (serviceData) {
                        serviceId = serviceData.id;
                      } else {
                        // Create a placeholder service if not found
                        const { data: newService, error: serviceError } = await supabase
                          .from('public_services')
                          .insert({
                            name: args.service_name,
                            service_type: args.service_type,
                            address: 'São Paulo, SP',
                            district: 'Centro',
                            latitude: -23.5505,
                            longitude: -46.6333,
                          })
                          .select('id')
                          .single();
                        
                        if (newService) {
                          serviceId = newService.id;
                        } else {
                          console.error('Error creating service:', serviceError);
                        }
                      }

                      if (serviceId) {
                        // Create service_visit first (required for service_ratings)
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 7);
                        
                        const { data: visitData, error: visitError } = await supabase
                          .from('service_visits')
                          .insert({
                            user_id: userId,
                            service_id: serviceId,
                            visited_at: new Date().toISOString(),
                            expires_at: expiresAt.toISOString(),
                            status: 'completed',
                          })
                          .select('id')
                          .single();

                        if (visitError) {
                          console.error('Error creating visit:', visitError);
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            choices: [{ delta: { content: '\n\n❌ Erro ao registrar a visita. Por favor, tente novamente.' } }]
                          })}\n\n`));
                        } else {
                          // Insert service rating
                          const { data: ratingData, error: ratingError } = await supabase
                            .from('service_ratings')
                            .insert({
                              user_id: userId,
                              service_id: serviceId,
                              visit_id: visitData.id,
                              rating_stars: args.rating_stars,
                              rating_text: args.rating_text,
                              sentiment: args.sentiment,
                            })
                            .select('id')
                            .single();

                          if (ratingError) {
                            console.error('Error inserting rating:', ratingError);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                              choices: [{ delta: { content: '\n\n❌ Erro ao salvar a avaliação. Por favor, tente novamente.' } }]
                            })}\n\n`));
                          } else {
                            console.log('Service rating created:', ratingData.id);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                              choices: [{ delta: { content: `\n\n✅ Sua avaliação foi registrada com sucesso! Obrigado por ajudar a melhorar os serviços públicos. [RATING_CREATED:${ratingData.id}]` } }]
                            })}\n\n`));
                          }
                        }
                      } else {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          choices: [{ delta: { content: '\n\n❌ Não foi possível identificar o serviço. Por favor, tente novamente.' } }]
                        })}\n\n`));
                      }
                    } catch (parseError) {
                      console.error('Error parsing tool call arguments:', parseError);
                    }
                  }
                  
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  
                  // Check for tool calls
                  const delta = parsed.choices?.[0]?.delta;
                  if (delta?.tool_calls) {
                    const toolCall = delta.tool_calls[0];
                    if (toolCall.function?.name === 'create_service_rating') {
                      toolCallData = toolCall;
                    }
                    if (toolCall.function?.arguments) {
                      toolCallArgs += toolCall.function.arguments;
                    }
                    // Don't stream tool call data to client
                    continue;
                  }
                  
                  // Regular content
                  const content = delta?.content;
                  if (content) {
                    fullContent += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
                  }
                } catch (e) {
                  // Pass through unparseable lines
                  controller.enqueue(encoder.encode(line + '\n'));
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
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
