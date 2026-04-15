import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET')?.trim();
  const headerSecret = req.headers.get('x-cron-secret')?.trim();
  if (cronSecret && headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Variáveis de ambiente não configuradas',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase.rpc('analyze_report_patterns');

    if (error) {
      console.error('[analyze-patterns] RPC error:', error);

      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Erro ao executar analyze_report_patterns',
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: syncData, error: syncErr } = await supabase.rpc('sync_pattern_threshold_events');
    if (syncErr) {
      console.error('[analyze-patterns] sync_pattern_threshold_events:', syncErr);
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        result: data,
        threshold_sync: syncErr ? { error: syncErr.message } : syncData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[analyze-patterns] Unexpected error:', err);

    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Erro inesperado ao executar análise',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
