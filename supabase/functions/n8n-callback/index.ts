import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-secret',
};

interface CallbackPayload {
  report_id: string;
  report_type: 'urban' | 'transport' | 'service_rating';
  secret_key: string;
  processed_data: {
    priority?: string;
    validated_category?: string;
    tags?: string[];
    enriched_data?: Record<string, unknown>;
    workflow_id?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: CallbackPayload = await req.json();
    console.log('[n8n-callback] Received callback:', JSON.stringify(payload));

    // Validate required fields
    if (!payload.report_id || !payload.report_type || !payload.secret_key) {
      console.error('[n8n-callback] Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: report_id, report_type, secret_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate secret key
    const { data: settings } = await supabase
      .from('n8n_settings')
      .select('secret_key')
      .eq('is_connected', true)
      .limit(1)
      .single();

    if (!settings || settings.secret_key !== payload.secret_key) {
      console.error('[n8n-callback] Invalid secret key');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid secret key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the inbound request
    await supabase
      .from('n8n_integration_logs')
      .insert({
        event_type: 'inbound',
        entity_type: payload.report_type,
        entity_id: payload.report_id,
        payload: payload,
        status: 'received'
      });

    // Prepare update data
    const updateData = {
      n8n_processed: true,
      n8n_processed_at: new Date().toISOString(),
      n8n_priority: payload.processed_data.priority,
      n8n_validated_category: payload.processed_data.validated_category,
      n8n_tags: payload.processed_data.tags,
      n8n_enriched_data: payload.processed_data.enriched_data,
      n8n_workflow_id: payload.processed_data.workflow_id
    };

    // Update the appropriate table
    let updateResult;
    if (payload.report_type === 'urban') {
      updateResult = await supabase
        .from('urban_reports')
        .update(updateData)
        .eq('id', payload.report_id);
    } else if (payload.report_type === 'transport') {
      updateResult = await supabase
        .from('transport_reports')
        .update(updateData)
        .eq('id', payload.report_id);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid report_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (updateResult.error) {
      console.error('[n8n-callback] Update error:', updateResult.error);
      return new Response(
        JSON.stringify({ success: false, error: updateResult.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[n8n-callback] Successfully updated report:', payload.report_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Report updated successfully',
        report_id: payload.report_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[n8n-callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
