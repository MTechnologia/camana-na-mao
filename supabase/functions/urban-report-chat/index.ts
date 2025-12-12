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

## 🎯 PROPÓSITO DESTA CONVERSA
Esta é uma jornada FOCADA para registrar problemas urbanos na cidade de São Paulo.

## ✅ DADOS A COLETAR (Slot Filling)
1. **[PROBLEMA]** - Descrição do problema (OBRIGATÓRIO)
2. **[LOCALIZAÇÃO]** - Endereço ou ponto de referência (OBRIGATÓRIO para criar o relato)
3. **[DETALHES]** - Informações adicionais (OPCIONAL - só se o usuário oferecer)

## 🗣️ COMO CONVERSAR
- Seja acolhedora e empática, como uma vizinha prestativa
- Deixe o cidadão contar o problema do jeito dele
- NÃO faça perguntas sequenciais como um formulário
- Extraia as informações naturalmente do que ele já disse
- Se faltar a localização, pergunte de forma natural: "E onde fica isso?" ou "Pode me dizer o endereço ou um ponto de referência?"

## 🔍 INFERIR AUTOMATICAMENTE
- **Categoria**: Detecte pelo contexto do que o cidadão fala:
  • Poste apagado, luz queimada, escuro, lâmpada → "iluminacao"
  • Buraco na calçada, passeio quebrado, rampa → "calcada"  
  • Asfalto, rua esburacada, semáforo, sinalização → "via_publica"
  • Lixo, entulho, lixeira cheia, descarte → "lixo"
  • Praça, árvore, mato alto, parque abandonado → "area_verde"
  • Outros problemas → "outro"

- **Subcategoria**: Extraia o tipo específico (ex: "poste apagado", "buraco grande", "mato alto")

## 📋 FLUXO IDEAL
1. Cidadão descreve o problema
2. Você demonstra que entendeu e pede localização se necessário
3. Resume de forma amigável: "Entendi! Então tem [problema] na [localização]. Posso registrar seu relato?"
4. Aguarda confirmação (sim, pode, ok, manda, etc)
5. Chama create_urban_report com os dados inferidos

## 🚫 GUARDRAILS DE ESCOPO (CRÍTICO)

### SE O USUÁRIO SAIR DO TEMA:
Se o cidadão perguntar sobre transporte público, ônibus, metrô:
→ "Entendo sua preocupação com o transporte! Para problemas com ônibus ou metrô, temos um canal especializado. Quer que eu te direcione para o Diagnóstico de Transporte? Ou podemos continuar com seu relato urbano se preferir."

Se perguntar sobre notícias, audiências, vereadores, legislação:
→ "Boa pergunta! Esse assunto eu não consigo detalhar aqui, mas nosso assistente geral pode te ajudar. Quer voltar ao início para perguntar sobre isso? Ou podemos continuar registrando seu problema urbano."

Se pedir informações gerais não relacionadas:
→ "Hmm, isso foge um pouco do que consigo ajudar aqui no registro de problemas urbanos. Posso te direcionar ao assistente geral para essa dúvida. Mas se você tem algum problema na cidade para relatar, estou aqui!"

### SE O USUÁRIO QUISER SAIR DA JORNADA:
Se disser "quero falar sobre outra coisa", "cancelar", "sair":
→ "Sem problemas! Você pode voltar quando quiser. Só clicar na setinha ← no topo para ir ao início. Até mais! 👋"

## ⚠️ REGRAS IMPORTANTES
- NUNCA pergunte sobre gravidade ou criticidade - isso será definido pela equipe
- NUNCA faça várias perguntas de uma vez
- NUNCA pareça um formulário ou questionário
- SEMPRE confirme antes de criar o relato
- Use linguagem simples e acessível
- Seja breve nas respostas
- NÃO invente funcionalidades que não existem`;

// Cross-journey intent detection patterns
const INTENT_PATTERNS: Record<string, string[]> = {
  transport: ['ônibus', 'onibus', 'metrô', 'metro', 'trem', 'cptm', 'sptrans', 'lotação', 'atraso de ônibus', 'terminal', 'estação', 'bilhete único'],
  evaluate: ['avaliar', 'avaliação', 'reclamar', 'elogiar', 'ubs', 'hospital', 'escola', 'ceu', 'atendimento', 'nota', 'estrelas'],
  general: ['notícia', 'audiência', 'vereador', 'comissão', 'legislativo', 'câmara', 'lei', 'projeto']
};

function detectCrossIntent(message: string, currentJourney: string): { journey: string | null; confidence: number } {
  const lowerMessage = message.toLowerCase();
  
  for (const [journey, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (journey === currentJourney) continue;
    
    const matches = keywords.filter(keyword => lowerMessage.includes(keyword));
    if (matches.length >= 2) {
      return { journey, confidence: 0.9 };
    } else if (matches.length === 1) {
      return { journey, confidence: 0.6 };
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
    const crossIntent = lastUserMessage ? detectCrossIntent(lastUserMessage.content, 'urban_report') : null;
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

        // Notify N8N about the new report
        try {
          await supabase.functions.invoke('notify-n8n', {
            body: {
              event: 'urban_report_created',
              report_id: report.id,
              report_type: 'urban',
              report_data: {
                category: reportData.category,
                subcategory: reportData.subcategory,
                description: reportData.description,
                location_address: reportData.location_address
              },
              user_id: userId
            }
          });
          console.log('N8N notification sent for urban report:', report.id);
        } catch (n8nError) {
          console.warn('Failed to notify N8N (non-blocking):', n8nError);
        }

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

    // If cross-intent detected, inject marker into stream
    if (crossIntent?.journey && crossIntent.confidence >= 0.6) {
      const reader = streamResponse.body!.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const customStream = new ReadableStream({
        async start(controller) {
          // Inject intent marker first
          const intentMarker = `data: ${JSON.stringify({ intent_detected: true, journey: crossIntent.journey, confidence: crossIntent.confidence })}\n\n`;
          controller.enqueue(encoder.encode(intentMarker));
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
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
