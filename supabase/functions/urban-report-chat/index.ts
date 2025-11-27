import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const tools = [
  {
    type: "function",
    function: {
      name: "create_urban_report",
      description: "Cria um relato urbano no banco de dados quando todas as informações necessárias foram coletadas e o usuário confirmou explicitamente o envio. NUNCA chame esta função sem confirmação explícita do usuário.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "area_verde", "outro"],
            description: "Categoria do problema urbano: iluminacao (postes, lâmpadas), calcada (buracos, irregularidades), via_publica (asfalto, sinalização), lixo (descarte irregular, lixeiras), area_verde (praças, árvores), outro"
          },
          subcategory: {
            type: "string",
            description: "Subcategoria específica do problema (ex: poste apagado, buraco na calçada, etc)"
          },
          description: {
            type: "string",
            description: "Descrição detalhada do problema relatado pelo usuário, incluindo detalhes relevantes"
          },
          severity: {
            type: "string",
            enum: ["baixa", "media", "alta", "critica"],
            description: "Gravidade do problema: baixa (incômodo menor), media (problema significativo), alta (risco à segurança), critica (perigo iminente)"
          },
          location_address: {
            type: "string",
            description: "Endereço ou localização do problema (rua, número, bairro, ponto de referência)"
          }
        },
        required: ["category", "description", "severity"],
        additionalProperties: false
      }
    }
  }
];

const systemPrompt = `Você é um assistente especializado em coletar relatos de problemas urbanos em São Paulo para a Câmara Municipal.

Sua função é fazer perguntas claras e objetivas para coletar informações sobre problemas urbanos:

1. **Categoria do problema** (obrigatório):
   - iluminacao: postes apagados, lâmpadas queimadas
   - calcada: buracos, irregularidades, falta de rampa
   - via_publica: asfalto danificado, sinalização, semáforos
   - lixo: descarte irregular, lixeiras transbordando
   - area_verde: praças abandonadas, árvores caídas, mato alto
   - outro: problemas não listados

2. **Descrição detalhada** (obrigatório): Detalhes específicos do problema

3. **Gravidade** (obrigatório):
   - baixa: incômodo menor, não urgente
   - media: problema significativo que precisa atenção
   - alta: risco à segurança ou acessibilidade
   - critica: perigo iminente à vida ou propriedade

4. **Localização** (opcional mas importante): Endereço, rua, bairro, ponto de referência

REGRAS IMPORTANTES:
- Seja empático, objetivo e direto
- Faça uma pergunta por vez
- Extraia informações das respostas naturalmente
- Quando tiver TODAS as informações necessárias (categoria, descrição, gravidade), faça um RESUMO claro do relato
- Pergunte: "Posso registrar seu relato?" ou similar
- SOMENTE chame a função create_urban_report após o usuário confirmar explicitamente (sim, pode, confirmo, etc)
- NUNCA crie o relato sem confirmação explícita do usuário
- Após criar o relato, agradeça e informe que o cidadão pode acompanhar pelo histórico`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Extrair user_id do token JWT
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      } catch (e) {
        console.error('Error parsing JWT:', e);
      }
    }

    // Primeira chamada: Chat com tools
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
          ...messages.slice(-15) // Últimas 15 mensagens para contexto
        ],
        tools,
        tool_choice: "auto",
        stream: false, // Primeiro sem stream para verificar tool calls
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua workspace." }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // Se há tool call para criar relato
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      
      if (toolCall.function.name === 'create_urban_report') {
        console.log('Tool call detected: create_urban_report');
        
        let reportData;
        try {
          reportData = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error('Error parsing tool arguments:', e);
          throw new Error('Erro ao processar dados do relato');
        }

        // Criar relato no banco de dados
        if (!userId) {
          throw new Error('Usuário não autenticado');
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          throw new Error('Configuração do Supabase não encontrada');
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: report, error: insertError } = await supabase
          .from('urban_reports')
          .insert({
            user_id: userId,
            category: reportData.category,
            subcategory: reportData.subcategory || null,
            description: reportData.description,
            severity: reportData.severity,
            location_address: reportData.location_address || null,
            status: 'pending',
            ai_classification: {
              collected_via: 'chat',
              tool_call: true,
              original_data: reportData
            }
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting report:', insertError);
          throw new Error('Erro ao salvar relato no banco de dados');
        }

        console.log('Report created successfully:', report.id);

        // Gerar resposta de confirmação via streaming
        const confirmationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você acabou de criar com sucesso um relato urbano para o cidadão. Agradeça brevemente, confirme que o relato foi registrado, e informe que ele pode acompanhar o status pelo histórico de relatos. Seja conciso e simpático.' },
              { role: 'user', content: `Relato criado com sucesso. Dados: categoria=${reportData.category}, descrição=${reportData.description}, gravidade=${reportData.severity}, endereço=${reportData.location_address || 'não informado'}` }
            ],
            stream: true,
          }),
        });

        if (!confirmationResponse.ok) {
          // Se falhar, retornar mensagem estática
          const staticMessage = `✅ Relato registrado com sucesso!\n\nSeu relato sobre "${reportData.description.slice(0, 50)}..." foi enviado para análise. Você pode acompanhar o status na seção "Meus Relatos".\n\n[REPORT_CREATED:${report.id}]`;
          
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              const data = `data: ${JSON.stringify({ choices: [{ delta: { content: staticMessage } }] })}\n\n`;
              controller.enqueue(encoder.encode(data));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
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
        }

        // Criar stream customizado que adiciona o marcador no final
        const reader = confirmationResponse.body!.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const customStream = new ReadableStream({
          async start(controller) {
            let fullContent = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              controller.enqueue(value);
              
              // Extrair conteúdo para saber quando terminar
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const data = JSON.parse(line.slice(6));
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) fullContent += content;
                  } catch (e) {}
                }
              }
            }
            
            // Adicionar marcador especial no final
            const marker = `\n\n[REPORT_CREATED:${report.id}]`;
            const markerData = `data: ${JSON.stringify({ choices: [{ delta: { content: marker } }] })}\n\n`;
            controller.enqueue(encoder.encode(markerData));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new Response(customStream, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
        });
      }
    }

    // Se não há tool call, fazer streaming normal da resposta com retry
    let streamResponse: Response | null = null;
    let retries = 3;
    
    while (retries > 0) {
      streamResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-15)
          ],
          stream: true,
        }),
      });

      if (streamResponse.ok) break;
      
      if (streamResponse.status === 503 || streamResponse.status === 500) {
        retries--;
        if (retries > 0) {
          console.log(`AI gateway returned ${streamResponse.status}, retrying... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
      }
      
      throw new Error(`AI gateway streaming error: ${streamResponse.status}`);
    }

    if (!streamResponse || !streamResponse.ok) {
      throw new Error('Failed to get streaming response after retries');
    }

    return new Response(streamResponse.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error) {
    console.error('Error in urban-report-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
