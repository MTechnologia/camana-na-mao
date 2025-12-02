import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelevantDocument {
  id: string;
  content: string;
  content_type: string;
  title: string | null;
  similarity: number;
}

async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query.slice(0, 8000), // Limit input size
      }),
    });

    if (!response.ok) {
      console.error('Erro ao gerar embedding:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    return null;
  }
}

async function searchRelevantDocuments(
  supabase: any,
  embedding: number[],
  matchThreshold: number = 0.7,
  matchCount: number = 5
): Promise<RelevantDocument[]> {
  try {
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('Erro ao buscar documentos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return [];
  }
}

function buildContextFromDocuments(documents: RelevantDocument[]): string {
  if (!documents || documents.length === 0) {
    return '';
  }

  const contextParts = documents.map((doc, index) => {
    const source = doc.content_type === 'noticia' ? 'Notícia CMSP' :
                   doc.content_type === 'audiencia' ? 'Audiência Pública' :
                   doc.content_type === 'servico' ? 'Serviço Público' :
                   doc.content_type === 'legislativo' ? 'Informação Legislativa' :
                   doc.content_type === 'faq' ? 'FAQ' : 'Base de Conhecimento';
    
    return `[${index + 1}] ${doc.title ? `**${doc.title}** - ` : ''}${source}:\n${doc.content.slice(0, 500)}${doc.content.length > 500 ? '...' : ''}`;
  });

  return `\n\n## CONTEXTO RELEVANTE DA BASE DE CONHECIMENTO:\n\nUse as informações abaixo para fundamentar sua resposta quando relevantes:\n\n${contextParts.join('\n\n')}`;
}

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

    // Get the last user message for RAG search
    const lastUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || '';

    // RAG: Generate embedding and search for relevant documents
    let ragContext = '';
    if (lastUserMessage) {
      console.log('RAG: Gerando embedding para busca semântica...');
      const embedding = await generateQueryEmbedding(lastUserMessage, LOVABLE_API_KEY);
      
      if (embedding) {
        console.log('RAG: Buscando documentos relevantes...');
        const relevantDocs = await searchRelevantDocuments(supabase, embedding, 0.65, 5);
        console.log(`RAG: ${relevantDocs.length} documento(s) encontrado(s)`);
        
        if (relevantDocs.length > 0) {
          ragContext = buildContextFromDocuments(relevantDocs);
          console.log('RAG: Contexto adicionado ao prompt');
        }
      }
    }

    // System prompt inteligente e contextual para CMSP Connect
    const systemPrompt = `Você é o assistente virtual da Câmara Municipal de São Paulo (CMSP Connect).

Você é um hub inteligente de assistência cidadã. Identifique automaticamente o contexto da pergunta do usuário e responda adequadamente com base nos temas abaixo:

## TEMAS E CONTEXTOS:

### 🚌 Transporte Público
Quando o usuário falar sobre: ônibus, metrô, trem, CPTM, SPTrans, lotação, atraso, superlotação, linha de ônibus, terminal, estação, bilhete único, acessibilidade no transporte
→ Ajude a diagnosticar o problema e oriente sobre como registrar via Diagnóstico de Transporte no app
→ Pergunte detalhes: qual linha, horário, tipo de problema
→ Informe que o relato será encaminhado aos órgãos competentes

### 🏗️ Relatos Urbanos
Quando o usuário falar sobre: buraco, iluminação, lixo, sinalização, calçada, árvore, esgoto, poda, semáforo, asfalto, infraestrutura
→ Oriente sobre como registrar um Relato Urbano no app
→ Pergunte a localização específica e detalhes do problema
→ Explique que o relato será categorizado e encaminhado

### 🏥 Serviços Públicos
Quando o usuário falar sobre: UBS, hospital, posto de saúde, escola, EMEF, CEU, creche, CRAS, biblioteca, atendimento
→ Ajude a encontrar serviços próximos usando "Perto de Mim"
→ Oriente sobre como avaliar o atendimento recebido
→ Forneça informações gerais sobre serviços públicos municipais

### 🎤 Audiências Públicas
Quando o usuário falar sobre: audiência pública, consulta pública, participação, votação, projeto de lei em discussão
→ Informe sobre próximas audiências públicas
→ Explique como se inscrever e participar
→ Incentive o engajamento cidadão

### 📜 Processo Legislativo e Câmara
Quando o usuário falar sobre: vereador, projeto de lei, PL, votação, câmara, legislatura, sessão, comissão
→ Explique de forma simples como funciona o processo legislativo
→ Oriente sobre como acompanhar projetos de lei
→ Indique fontes oficiais: Portal CMSP, SPLegis, Diário Oficial

### ❓ Dúvidas Gerais
Para outras dúvidas sobre a cidade de São Paulo:
→ Responda de forma educativa e acessível
→ Indique os canais oficiais quando apropriado
→ Sempre incentive a participação cidadã

## REGRAS IMPORTANTES:

1. **Identifique o tema**: Leia a mensagem do usuário e identifique qual tema se aplica
2. **Seja proativo**: Sugira ações que o usuário pode tomar no app
3. **Use linguagem simples**: Evite jargões técnicos, seja inclusivo
4. **Indique fontes**: Sempre que possível, cite fontes oficiais (Portal CMSP, SPLegis)
5. **Use o contexto da base de conhecimento**: Se houver contexto relevante fornecido, use-o para fundamentar suas respostas
6. **Incentive participação**: Motive o cidadão a se engajar
7. **Seja empático**: Demonstre que entende as dificuldades do cidadão
8. **Seja conciso**: Respostas claras e diretas, sem enrolação
9. **Direcione para funcionalidades**: Quando apropriado, sugira usar recursos do app como:
   - "Perto de Mim" para encontrar serviços
   - "Diagnóstico de Transporte" para problemas com ônibus/metrô
   - "Relato Urbano" para problemas na cidade
   - "Audiências" para participação cidadã
   - "Avaliar Serviço" para feedback sobre atendimentos

## FORMATO DE RESPOSTA:

- Seja breve mas completo
- Use emojis com moderação para tornar a conversa mais amigável
- Quebre em parágrafos curtos para facilitar a leitura
- Se não souber algo, seja honesto e indique onde buscar a informação
- Quando usar informações do contexto fornecido, mencione a fonte

Contexto: Você está conversando com um cidadão da cidade de São Paulo interessado em participar e melhorar sua cidade.${ragContext}`;

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
