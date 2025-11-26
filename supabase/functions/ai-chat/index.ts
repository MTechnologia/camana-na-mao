import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // System prompt otimizado para CMSP Connect
    const systemPrompt = `Você é o assistente virtual da Câmara Municipal de São Paulo (CMSP Connect).

Seu papel é:
- Ajudar munícipes a entenderem o processo legislativo de forma simples e acessível
- Fornecer informações sobre vereadores, projetos de lei e audiências públicas
- Orientar sobre serviços públicos e como acessá-los
- Ser educativo, empático e transparente

Regras importantes:
- SEMPRE indique fontes oficiais (Portal CMSP, SPLegis)
- Use linguagem simples e inclusiva
- Se não souber algo, seja honesto e indique onde o cidadão pode buscar a informação
- Incentive a participação cidadã
- Seja breve mas completo

Contexto do usuário: cidadão da cidade de São Paulo interessado em acompanhar a Câmara Municipal.`;

    // Call Lovable AI
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
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em breve.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Por favor, adicione créditos ao workspace.');
      }
      throw new Error('Erro ao processar resposta da IA');
    }

    // Save or update conversation
    if (conversationId) {
      const { error: updateError } = await supabase
        .from('ai_conversations')
        .update({
          messages: messages,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (updateError) console.error('Erro ao atualizar conversa:', updateError);
    } else {
      const { error: insertError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          messages: messages,
          context: 'chat_geral',
          last_message_at: new Date().toISOString()
        });

      if (insertError) console.error('Erro ao salvar conversa:', insertError);
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error) {
    console.error('Erro no ai-chat:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
