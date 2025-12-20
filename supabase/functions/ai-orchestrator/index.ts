import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Unified tools for all citizen actions
const tools = [
  {
    type: "function",
    function: {
      name: "create_urban_report",
      description: "Registra problema urbano ou feedback sobre a Câmara. Usar quando cidadão descrever: buracos, iluminação, lixo, calçadas, esgoto, ou feedback sobre vereadores/serviços da Câmara.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "area_verde", "outro"],
            description: "Inferir: iluminacao (poste, luz), calcada (buraco, passeio), via_publica (asfalto, semáforo), lixo (entulho), area_verde (praça, árvore), outro (feedback câmara)"
          },
          subcategory: { type: "string", description: "Tipo específico do problema" },
          description: { type: "string", description: "Resumo completo do problema" },
          location_address: { type: "string", description: "Localização (rua, bairro, referência)" }
        },
        required: ["category", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_transport_report",
      description: "Registra problema no transporte público. Usar quando cidadão falar de: ônibus, metrô, CPTM, atrasos, lotação, segurança em transporte.",
      parameters: {
        type: "object",
        properties: {
          report_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "outro"],
            description: "Tipo do problema"
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "critical=risco à vida, high=atraso>1h, medium=15-60min, low=inconveniência"
          },
          description: { type: "string", description: "Descrição do problema" },
          occurrence_date: { type: "string", description: "Data YYYY-MM-DD (inferir 'hoje' se contexto indicar)" },
          occurrence_time: { type: "string", description: "Horário HH:MM" },
          line_code: { type: "string", description: "Linha de ônibus/metrô" },
          location: { type: "string", description: "Ponto, estação ou trecho" },
          impact_description: { type: "string", description: "Como afetou a rotina" }
        },
        required: ["report_type", "description", "occurrence_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_service_rating",
      description: "Registra avaliação de serviço público. Usar quando cidadão quiser avaliar: UBS, escola, hospital, CEU, biblioteca, centro esportivo.",
      parameters: {
        type: "object",
        properties: {
          service_name: { type: "string", description: "Nome do serviço avaliado" },
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "Tipo do serviço"
          },
          rating_stars: { type: "integer", minimum: 1, maximum: 5, description: "Nota 1-5 estrelas" },
          rating_text: { type: "string", description: "Comentário da avaliação" },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative"],
            description: "Sentimento geral"
          }
        },
        required: ["service_name", "service_type", "rating_stars", "rating_text", "sentiment"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Busca informações sobre a Câmara Municipal: vereadores, audiências, projetos de lei, notícias, funcionamento legislativo.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca" }
        },
        required: ["query"]
      }
    }
  }
];

// Lean system prompt (~400 tokens)
const systemPrompt = `Você é o Assistente CMSP, da Câmara Municipal de São Paulo. Ajuda cidadãos de forma empática e direta.

CAPACIDADES (use as tools quando apropriado):
• Informações sobre a Câmara → search_knowledge_base
• Problemas urbanos (buracos, iluminação, lixo) → create_urban_report
• Problemas de transporte (ônibus, metrô) → create_transport_report  
• Avaliar serviços (UBS, escola, hospital) → create_service_rating

COLETA DE DADOS:
- Converse naturalmente, extraia informações do contexto
- Pergunte apenas o essencial (1-2 perguntas por vez)
- Infira: categoria, data ("hoje" se não especificado), severidade
- Chame a tool quando tiver dados suficientes

TOM:
- Empático, breve, linguagem simples
- Demonstre que entendeu antes de perguntar
- Confirme resumidamente antes de registrar

LIMITES:
- Não invente funcionalidades
- Se não souber, diga e sugira onde buscar
- Data de hoje: ${new Date().toISOString().split('T')[0]}`;

// Helper: Search knowledge base
async function searchKnowledgeBase(supabase: any, query: string): Promise<string> {
  const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2).slice(0, 5);
  if (searchTerms.length === 0) return '';

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('content, content_type, title')
    .or(searchTerms.map(term => `content.ilike.%${term}%`).join(','))
    .limit(5);

  if (error || !data?.length) return '';

  return data.map((doc: any, i: number) => {
    const source = doc.content_type === 'noticia' ? 'Notícia' : 
                   doc.content_type === 'audiencia' ? 'Audiência' : 'Info';
    return `[${i+1}] ${doc.title || source}: ${doc.content.slice(0, 300)}...`;
  }).join('\n\n');
}

// Helper: Execute tool and insert into database
async function executeTool(
  toolName: string, 
  args: any, 
  userId: string, 
  supabase: any
): Promise<{ success: boolean; id?: string; error?: string; marker?: string }> {
  
  try {
    switch (toolName) {
      case 'create_urban_report': {
        const { data, error } = await supabase
          .from('urban_reports')
          .insert({
            user_id: userId,
            category: args.category,
            subcategory: args.subcategory || null,
            description: args.description,
            severity: 'media',
            location_address: args.location_address || null,
            status: 'pending',
            ai_classification: { collected_via: 'orchestrator', tool_call: true }
          })
          .select('id')
          .single();

        if (error) throw error;

        // Notify N8N (non-blocking)
        supabase.functions.invoke('notify-n8n', {
          body: { event: 'urban_report_created', report_id: data.id, report_type: 'urban', user_id: userId }
        }).catch(console.warn);

        return { success: true, id: data.id, marker: `[REPORT_CREATED:${data.id}]` };
      }

      case 'create_transport_report': {
        const { data, error } = await supabase
          .from('transport_reports')
          .insert({
            user_id: userId,
            report_type: args.report_type,
            severity: args.severity || 'medium',
            description: args.description,
            occurrence_date: args.occurrence_date,
            occurrence_time: args.occurrence_time || null,
            line_code_custom: args.line_code || null,
            location: args.location || null,
            impact_description: args.impact_description || null,
            ai_sentiment: 'neutral',
            ai_category: args.report_type,
            status: 'pending'
          })
          .select('id')
          .single();

        if (error) throw error;

        supabase.functions.invoke('notify-n8n', {
          body: { event: 'transport_report_created', report_id: data.id, report_type: 'transport', user_id: userId }
        }).catch(console.warn);

        return { success: true, id: data.id, marker: `[TRANSPORT_CREATED:${data.id}]` };
      }

      case 'create_service_rating': {
        // Find or create service
        let serviceId: string;
        const { data: existingService } = await supabase
          .from('public_services')
          .select('id')
          .or(`name.ilike.%${args.service_name}%,service_type.eq.${args.service_type}`)
          .limit(1)
          .single();

        if (existingService) {
          serviceId = existingService.id;
        } else {
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
          
          if (serviceError) throw serviceError;
          serviceId = newService.id;
        }

        // Create visit
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

        if (visitError) throw visitError;

        // Create rating
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

        if (ratingError) throw ratingError;

        return { success: true, id: ratingData.id, marker: `[RATING_CREATED:${ratingData.id}]` };
      }

      case 'search_knowledge_base': {
        const context = await searchKnowledgeBase(supabase, args.query);
        return { success: true, id: 'search', error: context || 'Nenhum resultado encontrado.' };
      }

      default:
        return { success: false, error: 'Tool não reconhecida' };
    }
  } catch (error) {
    console.error(`Error executing ${toolName}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase não configurado');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Usuário não autenticado');

    console.log('[ai-orchestrator] Processing for user:', user.id);

    // First call: Let AI decide if tool is needed
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
          ...messages.slice(-20)
        ],
        tools,
        tool_choice: 'auto',
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // If tool call detected, execute it
    if (toolCalls?.length > 0) {
      const toolCall = toolCalls[0];
      console.log('[ai-orchestrator] Tool call:', toolCall.function.name);

      let toolArgs;
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        throw new Error('Erro ao processar argumentos da tool');
      }

      const toolResult = await executeTool(toolCall.function.name, toolArgs, user.id, supabase);
      console.log('[ai-orchestrator] Tool result:', toolResult);

      // Generate confirmation response with streaming
      const confirmPrompt = toolResult.success
        ? `A ação foi executada com sucesso. ${
            toolCall.function.name === 'search_knowledge_base' 
              ? `Contexto encontrado:\n${toolResult.error}\n\nResponda a pergunta do usuário usando este contexto.`
              : 'Agradeça brevemente (2-3 frases), confirme o registro e mencione que pode acompanhar pelo app.'
          }`
        : `Houve um erro: ${toolResult.error}. Peça desculpas e sugira tentar novamente.`;

      const confirmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é o Assistente CMSP. Responda de forma breve e empática.' },
            ...messages.slice(-5),
            { role: 'user', content: confirmPrompt }
          ],
          stream: true,
        }),
      });

      if (!confirmResponse.ok) {
        // Fallback static message
        const staticMsg = toolResult.success 
          ? `✅ Pronto! Registro salvo com sucesso.\n\n${toolResult.marker || ''}`
          : `❌ Erro: ${toolResult.error}`;
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: staticMsg } }] })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }

      // Stream response with marker injection
      const reader = confirmResponse.body!.getReader();
      const encoder = new TextEncoder();
      
      const customStream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }

          // Inject success marker at the end
          if (toolResult.marker) {
            const markerData = `data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n${toolResult.marker}` } }] })}\n\n`;
            controller.enqueue(encoder.encode(markerData));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(customStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // No tool call - stream regular response
    const streamResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-20)
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      throw new Error(`Stream error: ${streamResponse.status}`);
    }

    // Save conversation
    if (conversationId) {
      await supabase
        .from('ai_conversations')
        .update({
          messages,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', user.id);
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    console.error('[ai-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
