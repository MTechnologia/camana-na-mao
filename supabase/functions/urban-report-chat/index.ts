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
      description: "Cria um relato urbano quando o usuário descreveu um problema e confirmou o envio. Inferir a categoria automaticamente do contexto da conversa.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "area_verde", "outro"],
            description: "Inferir automaticamente do contexto: iluminacao (poste, luz, lâmpada, escuro), calcada (buraco, calçada, passeio, rampa), via_publica (asfalto, rua, sinalização, semáforo, trânsito), lixo (lixo, entulho, descarte, lixeira), area_verde (praça, árvore, mato, parque, jardim), outro (problemas não listados)"
          },
          subcategory: {
            type: "string",
            description: "Tipo específico do problema extraído da descrição do usuário (ex: poste apagado, buraco grande, mato alto)"
          },
          description: {
            type: "string",
            description: "Resumo completo do problema com todos os detalhes mencionados pelo usuário na conversa"
          },
          location_address: {
            type: "string",
            description: "Localização mencionada pelo usuário (rua, bairro, ponto de referência, número)"
          }
        },
        required: ["category", "description"],
        additionalProperties: false
      }
    }
  }
];

const systemPrompt = `Você é Luana, assistente da Câmara Municipal de São Paulo, ajudando cidadãos a registrar problemas urbanos de forma natural e amigável.

COMO CONVERSAR:
- Seja acolhedora e empática, como uma vizinha prestativa
- Deixe o cidadão contar o problema do jeito dele
- NÃO faça perguntas sequenciais como um formulário
- Extraia as informações naturalmente do que ele já disse
- Se faltar a localização, pergunte de forma natural: "E onde fica isso?" ou "Pode me dizer o endereço ou um ponto de referência?"

INFERIR AUTOMATICAMENTE:
- **Categoria**: Detecte pelo contexto do que o cidadão fala:
  • Poste apagado, luz queimada, escuro, lâmpada → "iluminacao"
  • Buraco na calçada, passeio quebrado, rampa → "calcada"  
  • Asfalto, rua esburacada, semáforo, sinalização → "via_publica"
  • Lixo, entulho, lixeira cheia, descarte → "lixo"
  • Praça, árvore, mato alto, parque abandonado → "area_verde"
  • Outros problemas → "outro"

- **Subcategoria**: Extraia o tipo específico (ex: "poste apagado", "buraco grande", "mato alto")

O QUE COLETAR:
1. Entender o problema (obrigatório) - deixe o cidadão descrever livremente
2. Localização (importante) - pergunte naturalmente se não mencionou
3. Detalhes extras - só se fizer sentido na conversa

FLUXO IDEAL:
1. Cidadão descreve o problema
2. Você demonstra que entendeu e pede localização se necessário
3. Resume de forma amigável: "Entendi! Então tem [problema] na [localização]. Posso registrar seu relato?"
4. Aguarda confirmação (sim, pode, ok, manda, etc)
5. Chama create_urban_report com os dados inferidos

REGRAS IMPORTANTES:
- NUNCA pergunte sobre gravidade ou criticidade - isso será definido pela equipe
- NUNCA faça várias perguntas de uma vez
- NUNCA pareça um formulário ou questionário
- SEMPRE confirme antes de criar o relato
- Use linguagem simples e acessível
- Seja breve nas respostas`;

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
            severity: 'media', // Valor padrão - será avaliado pela equipe
            location_address: reportData.location_address || null,
            status: 'pending',
            ai_classification: {
              collected_via: 'chat',
              tool_call: true,
              inferred_category: true,
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
              { role: 'system', content: 'Você acabou de criar com sucesso um relato urbano para o cidadão. Agradeça de forma breve e simpática, confirme que o relato foi registrado, e informe que ele pode acompanhar o status pelo histórico de relatos. Seja conciso (2-3 frases no máximo).' },
              { role: 'user', content: `Relato criado com sucesso. Dados: categoria=${reportData.category}, descrição=${reportData.description}, endereço=${reportData.location_address || 'não informado'}` }
            ],
            stream: true,
          }),
        });

        if (!confirmationResponse.ok) {
          // Se falhar, retornar mensagem estática
          const staticMessage = `✅ Pronto! Seu relato foi registrado com sucesso.\n\nVocê pode acompanhar o andamento na seção "Meus Relatos".\n\n[REPORT_CREATED:${report.id}]`;
          
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
