import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
  content: string;
  content_type: string;
  title?: string;
  source_id?: string;
  source_table?: string;
  metadata?: Record<string, unknown>;
}

interface BatchEmbeddingRequest {
  items: EmbeddingRequest[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const aiChatBaseUrl = Deno.env.get('AI_CHAT_BASE_URL') || Deno.env.get('AI_BASE_URL');
    const aiChatApiKey = Deno.env.get('AI_CHAT_API_KEY') || Deno.env.get('AI_API_KEY');
    
    if (!aiChatBaseUrl) {
      throw new Error('AI_CHAT_BASE_URL ou AI_BASE_URL não configurada');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis do Supabase não configuradas');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    
    // Support both single item and batch requests
    const items: EmbeddingRequest[] = body.items ? body.items : [body];
    
    if (!items.length) {
      throw new Error('Nenhum conteúdo fornecido');
    }

    console.log(`Processando ${items.length} item(s) para embeddings...`);

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        if (!item.content || !item.content_type) {
          errors.push({ item, error: 'content e content_type são obrigatórios' });
          continue;
        }

        // Truncate content if too long (max ~8000 tokens ≈ 32000 chars)
        const truncatedContent = item.content.slice(0, 32000);

        console.log(`Gerando embedding para: ${item.title || item.content_type}`);

        // Generate embedding using AI provider (OpenAI-compatible endpoint)
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (aiChatApiKey) {
          headers['Authorization'] = `Bearer ${aiChatApiKey}`;
        }
        
        const embeddingsUrl = `${aiChatBaseUrl.replace(/\/$/, '')}/embeddings`;
        const embeddingResponse = await fetch(embeddingsUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: truncatedContent,
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error('Erro ao gerar embedding:', errorText);
          errors.push({ item: item.title || item.content_type, error: `API error: ${embeddingResponse.status}` });
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data?.[0]?.embedding;

        if (!embedding) {
          errors.push({ item: item.title || item.content_type, error: 'Embedding não retornado pela API' });
          continue;
        }

        console.log(`Embedding gerado com sucesso (${embedding.length} dimensões)`);

        // Check if entry already exists (by source_id and source_table)
        let existingId = null;
        if (item.source_id && item.source_table) {
          const { data: existing } = await supabase
            .from('knowledge_base')
            .select('id')
            .eq('source_id', item.source_id)
            .eq('source_table', item.source_table)
            .single();
          
          if (existing) {
            existingId = existing.id;
          }
        }

        // Upsert to knowledge_base
        const record = {
          content: truncatedContent,
          content_type: item.content_type,
          title: item.title || null,
          source_id: item.source_id || null,
          source_table: item.source_table || null,
          metadata: item.metadata || {},
          embedding: `[${embedding.join(',')}]`,
          updated_at: new Date().toISOString(),
        };

        let result;
        if (existingId) {
          // Update existing
          const { data, error } = await supabase
            .from('knowledge_base')
            .update(record)
            .eq('id', existingId)
            .select('id')
            .single();
          
          if (error) throw error;
          result = { id: data.id, action: 'updated' };
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('knowledge_base')
            .insert(record)
            .select('id')
            .single();
          
          if (error) throw error;
          result = { id: data.id, action: 'created' };
        }

        results.push({
          title: item.title || item.content_type,
          ...result,
        });

        console.log(`Registro ${result.action}: ${result.id}`);

      } catch (itemError) {
        console.error('Erro processando item:', itemError);
        errors.push({ 
          item: item.title || item.content_type, 
          error: (itemError as Error).message 
        });
      }
    }

    console.log(`Processamento concluído: ${results.length} sucesso(s), ${errors.length} erro(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no generate-embeddings:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
