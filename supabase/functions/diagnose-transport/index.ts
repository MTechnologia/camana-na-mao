import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const createTransportReportTool = {
  type: 'function',
  function: {
    name: 'create_transport_report',
    description: 'Cria um relato de problema no transporte público após coletar todas as informações necessárias do usuário',
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
          description: 'Gravidade do problema baseada no impacto descrito'
        },
        description: {
          type: 'string',
          description: 'Descrição detalhada do problema'
        },
        occurrence_date: {
          type: 'string',
          description: 'Data da ocorrência no formato YYYY-MM-DD'
        },
        occurrence_time: {
          type: 'string',
          description: 'Horário aproximado da ocorrência no formato HH:MM'
        },
        line_code: {
          type: 'string',
          description: 'Código ou nome da linha de ônibus/metrô'
        },
        location: {
          type: 'string',
          description: 'Local onde ocorreu o problema (ponto, estação, trecho)'
        },
        impact_description: {
          type: 'string',
          description: 'Como o problema impactou a rotina do usuário'
        },
        ai_sentiment: {
          type: 'string',
          enum: ['positive', 'neutral', 'negative'],
          description: 'Sentimento geral do relato'
        }
      },
      required: ['report_type', 'severity', 'description', 'occurrence_date']
    }
  }
};

const systemPrompt = `Você é Luana, assistente virtual da Câmara Municipal de São Paulo, especializada em diagnóstico de problemas no transporte público.

Sua função é:
1. Acolher o cidadão com empatia
2. Coletar informações de forma natural e conversacional
3. Inferir automaticamente a categoria do problema
4. Avaliar a severidade com base no impacto
5. Registrar o relato no sistema

INFORMAÇÕES OBRIGATÓRIAS A COLETAR:
- Qual linha de ônibus/metrô? (pergunte naturalmente)
- Que tipo de problema? (infira da descrição: atraso, lotação, segurança, acessibilidade, limpeza)
- Quando aconteceu? (data - OBRIGATÓRIO, horário se possível)
- Onde exatamente? (ponto, estação, trecho)
- Como isso afetou sua rotina? (para avaliar severidade)

FLUXO DA CONVERSA:
1. Cumprimente e pergunte sobre o problema
2. Faça perguntas complementares naturalmente (uma por vez)
3. Quando tiver TODAS as informações obrigatórias, use a função create_transport_report
4. Após criar o relato, confirme o registro com empatia

REGRAS IMPORTANTES:
- Seja empática e acolhedora
- Faça UMA pergunta por vez
- Infira a data como "hoje" se o usuário disser "hoje", "agora", "acabou de acontecer"
- Use a data atual (${new Date().toISOString().split('T')[0]}) quando inferir "hoje"
- NÃO peça confirmação antes de registrar - registre quando tiver as informações
- Após registrar, agradeça e explique que o relato será encaminhado

MAPEAMENTO DE SEVERIDADE:
- critical: Risco à vida, acidente, violência
- high: Perda de compromisso importante, atraso muito longo (>1h), problema recorrente
- medium: Atraso moderado (15-60min), desconforto significativo
- low: Inconveniência menor, sujeira leve`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Extract user_id from JWT
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      } catch (e) {
        console.error('Error parsing JWT:', e);
      }
    }

    console.log('Processing transport diagnosis for user:', userId);

    // First call - let AI decide if it needs to create a report
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
        tools: [createTransportReportTool],
        tool_choice: 'auto',
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
    const assistantMessage = data.choices?.[0]?.message;
    
    // Check if AI wants to call create_transport_report
    if (assistantMessage?.tool_calls?.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      
      if (toolCall.function.name === 'create_transport_report') {
        console.log('Tool call detected: create_transport_report');
        
        const args = JSON.parse(toolCall.function.arguments);
        console.log('Report data:', args);

        let reportId: string | null = null;
        let dbError: string | null = null;

        // Insert into database
        if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            
            const { data: insertedReport, error } = await supabase
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
                ai_sentiment: args.ai_sentiment || 'neutral',
                ai_category: args.report_type,
                status: 'pending'
              })
              .select('id')
              .single();

            if (error) {
              console.error('Database error:', error);
              dbError = error.message;
            } else {
              reportId = insertedReport.id;
              console.log('Report created with ID:', reportId);

              // Notify N8N about the new report
              try {
                await supabase.functions.invoke('notify-n8n', {
                  body: {
                    event: 'transport_report_created',
                    report_id: reportId,
                    report_type: 'transport',
                    report_data: {
                      report_type: args.report_type,
                      severity: args.severity,
                      description: args.description,
                      line_code: args.line_code,
                      location: args.location
                    },
                    user_id: userId
                  }
                });
                console.log('N8N notification sent for transport report:', reportId);
              } catch (n8nError) {
                console.warn('Failed to notify N8N (non-blocking):', n8nError);
              }
            }
          } catch (e) {
            console.error('Error inserting report:', e);
            dbError = (e as Error).message;
          }
        } else {
          console.warn('Missing credentials for database insert');
          dbError = 'Credenciais não disponíveis';
        }

        // Generate confirmation message with streaming
        const confirmationPrompt = reportId
          ? `O relato foi registrado com sucesso (ID: ${reportId}). Agradeça ao cidadão de forma empática, confirme que o relato sobre "${args.report_type}" na linha "${args.line_code || 'informada'}" foi registrado e será encaminhado para análise. Mencione que ele pode acompanhar o status pelo app. Seja breve e acolhedora.`
          : `Houve um problema ao registrar o relato: ${dbError}. Peça desculpas ao cidadão e sugira que tente novamente mais tarde.`;

        const confirmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você é Luana, assistente empática da Câmara Municipal de São Paulo. Responda de forma breve e acolhedora.' },
              { role: 'user', content: confirmationPrompt },
            ],
            stream: true,
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error(`Confirmation API error: ${confirmResponse.status}`);
        }

        // Create a TransformStream to inject the marker
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = confirmResponse.body!.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        (async () => {
          try {
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              await writer.write(value);
            }

            // Inject success marker at the end if report was created
            if (reportId) {
              const markerEvent = `data: {"choices":[{"delta":{"content":"\\n\\n[TRANSPORT_CREATED:${reportId}]"}}]}\n\n`;
              await writer.write(encoder.encode(markerEvent));
            }
            
            await writer.close();
          } catch (e) {
            console.error('Stream processing error:', e);
            await writer.abort(e);
          }
        })();

        return new Response(readable, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
        });
      }
    }

    // No tool call - return regular streaming response
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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      throw new Error(`Stream API error: ${streamResponse.status}`);
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
    console.error('Error in diagnose-transport function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
