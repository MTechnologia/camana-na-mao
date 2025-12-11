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

// Text-based search for knowledge base (no embeddings required)
async function searchRelevantDocuments(
  supabase: any,
  query: string,
  matchCount: number = 5
): Promise<RelevantDocument[]> {
  try {
    // Use text search with ILIKE for relevant documents
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2).slice(0, 5);
    
    if (searchTerms.length === 0) return [];

    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, content, content_type, title')
      .or(searchTerms.map(term => `content.ilike.%${term}%`).join(','))
      .limit(matchCount);

    if (error) {
      console.error('Erro ao buscar documentos:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({ ...doc, similarity: 0.8 }));
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

// Intent detection keywords for specialized journeys
const INTENT_PATTERNS = {
  transport: ['ônibus', 'onibus', 'metrô', 'metro', 'trem', 'cptm', 'sptrans', 'linha', 'lotação', 'lotacao', 'atraso de ônibus', 'terminal', 'estação', 'bilhete único'],
  urban_report: ['buraco', 'iluminação', 'iluminacao', 'poste', 'lixo', 'calçada', 'calcada', 'esgoto', 'semáforo', 'semaforo', 'asfalto', 'mato alto', 'árvore', 'arvore', 'entulho'],
  evaluate: ['avaliar', 'avaliação', 'avaliacao', 'reclamar', 'elogiar', 'ubs', 'hospital', 'escola', 'ceu', 'atendimento', 'nota', 'estrelas']
};

function detectIntent(message: string): { journey: string | null; confidence: number } {
  const lowerMessage = message.toLowerCase();
  
  for (const [journey, keywords] of Object.entries(INTENT_PATTERNS)) {
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

    // Get the last user message for RAG search and intent detection
    const lastUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || '';

    // Intent detection for specialized journeys
    const { journey: detectedJourney, confidence } = detectIntent(lastUserMessage);
    let intentSuggestion = '';
    
    if (detectedJourney && confidence >= 0.6) {
      const journeyNames: Record<string, string> = {
        transport: 'Diagnóstico de Transporte',
        urban_report: 'Relato Urbano',
        evaluate: 'Avaliação de Serviço'
      };
      
      if (confidence >= 0.9) {
        intentSuggestion = `\n\n## DETECÇÃO DE INTENÇÃO (Alta Confiança)
O usuário parece querer usar a funcionalidade "${journeyNames[detectedJourney]}". 
SUGIRA PROATIVAMENTE: "Parece que você quer ${detectedJourney === 'transport' ? 'relatar um problema no transporte público' : detectedJourney === 'urban_report' ? 'relatar um problema urbano' : 'avaliar um serviço público'}. Temos um canal especializado para isso! Quer que eu te direcione?"`;
      } else {
        intentSuggestion = `\n\n## DETECÇÃO DE INTENÇÃO (Média Confiança)
O usuário pode estar interessado em "${journeyNames[detectedJourney]}".
Se apropriado, mencione: "A propósito, se você precisar ${detectedJourney === 'transport' ? 'relatar um problema de transporte' : detectedJourney === 'urban_report' ? 'registrar um problema urbano' : 'avaliar um serviço'}, temos um canal específico para isso."`;
      }
    }

    // RAG: Search for relevant documents using text search
    let ragContext = '';
    if (lastUserMessage) {
      console.log('RAG: Buscando documentos relevantes por texto...');
      const relevantDocs = await searchRelevantDocuments(supabase, lastUserMessage, 5);
      console.log(`RAG: ${relevantDocs.length} documento(s) encontrado(s)`);
      
      if (relevantDocs.length > 0) {
        ragContext = buildContextFromDocuments(relevantDocs);
        console.log('RAG: Contexto adicionado ao prompt');
      }
    }

    // System prompt inteligente e contextual para CMSP Connect
    const systemPrompt = `Você é Luana, assistente virtual da Câmara Municipal de São Paulo (CMSP Connect).

## 🎯 PROPÓSITO DESTA CONVERSA
Este é o CHAT GERAL - você é um hub inteligente de assistência cidadã. Você responde perguntas gerais e DIRECIONA para jornadas especializadas quando apropriado.

## 🚀 FUNCIONALIDADES ESPECIALIZADAS DO APP
Quando o usuário mencionar esses temas, SUGIRA ATIVAMENTE a jornada apropriada:

### 🚌 Transporte Público
Keywords: ônibus, metrô, trem, CPTM, SPTrans, lotação, atraso
→ SUGERIR: "Para problemas com transporte público, temos o **Diagnóstico de Transporte** que registra seu relato direitinho. Quer usar?"

### 🏗️ Problemas Urbanos  
Keywords: buraco, iluminação, lixo, calçada, esgoto, semáforo, mato
→ SUGERIR: "Para problemas na cidade, temos o **Relato Urbano** especializado. Quer registrar seu problema lá?"

### ⭐ Avaliação de Serviços
Keywords: UBS, escola, hospital, atendimento, avaliar, nota
→ SUGERIR: "Para avaliar serviços públicos, temos a **Avaliação de Serviço**. Quer compartilhar sua experiência?"

## 📋 TEMAS QUE VOCÊ RESPONDE DIRETAMENTE
- 🎤 **Audiências Públicas**: Próximas audiências, como participar, temas em discussão
- 📜 **Processo Legislativo**: Como funciona a Câmara, projetos de lei, votações
- 👥 **Vereadores**: Informações sobre vereadores, comissões, contatos
- 📰 **Notícias da CMSP**: Notícias recentes, eventos, comunicados
- 🗺️ **Serviços Públicos**: Informações gerais sobre UBS, escolas, CEUs (mas avaliações vão para jornada específica)
- ❓ **Dúvidas Gerais**: Sobre São Paulo, participação cidadã, direitos

## 🔄 HANDOFF PARA JORNADAS ESPECIALIZADAS
Quando detectar que o usuário quer REGISTRAR algo (não apenas perguntar):
1. Reconheça o que ele quer fazer
2. Explique que existe uma funcionalidade especializada
3. Sugira: "Você pode acessar pelo menu de ações rápidas na tela inicial, ou eu posso te dar mais informações aqui mesmo!"

${intentSuggestion}

## ⚠️ REGRAS IMPORTANTES
1. **Identifique o tema**: Leia a mensagem e identifique qual tema se aplica
2. **Sugira jornadas especializadas**: Quando apropriado, direcione para funcionalidades específicas
3. **Use linguagem simples**: Evite jargões técnicos, seja inclusivo
4. **Indique fontes**: Sempre que possível, cite fontes oficiais (Portal CMSP, SPLegis)
5. **Use o contexto da base de conhecimento**: Se houver contexto relevante, use-o
6. **Seja empático**: Demonstre que entende as dificuldades do cidadão
7. **Seja conciso**: Respostas claras e diretas, sem enrolação
8. **NÃO invente funcionalidades**: Só mencione o que realmente existe no app

## 📝 FORMATO DE RESPOSTA
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

    // Create a TransformStream to inject intent detection marker
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Process stream and inject intent marker at the end
    (async () => {
      try {
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            await writer.write(value);
          }
        }
        
        // Inject intent detection marker at the end of stream if detected
        if (detectedJourney && confidence >= 0.6) {
          const intentMarker = `\n\ndata: {"intent_detected":true,"journey":"${detectedJourney}","confidence":${confidence}}\n\n`;
          await writer.write(encoder.encode(intentMarker));
        }
        
        await writer.close();
      } catch (error) {
        console.error('Error processing stream:', error);
        await writer.abort(error);
      }
    })();

    // Return streaming response with intent detection
    return new Response(readable, {
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
