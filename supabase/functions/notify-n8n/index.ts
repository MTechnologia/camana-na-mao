import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPayload {
  event: 'urban_report_created' | 'transport_report_created' | 'service_rating_created';
  report_id: string;
  report_type: 'urban' | 'transport' | 'service_rating';
  report_data: Record<string, unknown>;
  user_id?: string;
  // Orchestrator context for N8N agent routing
  source_tool?: string;
  tool_arguments?: Record<string, unknown>;
  tool_metadata?: {
    called_at: string;
    orchestrator_version: string;
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

    const payload: NotifyPayload = await req.json();
    console.log('[notify-n8n] Received payload:', JSON.stringify(payload));

    // Fetch N8N settings
    const { data: settings, error: settingsError } = await supabase
      .from('n8n_settings')
      .select('*')
      .eq('is_connected', true)
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.log('[notify-n8n] No active N8N integration found');
      return new Response(
        JSON.stringify({ success: false, message: 'No active N8N integration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this event type is enabled
    const enabledEvents = (settings.enabled_events as Array<{ key: string; enabled: boolean }>) || [];
    const eventConfig = enabledEvents.find(e => 
      (payload.event === 'urban_report_created' && e.key === 'urban_report') ||
      (payload.event === 'transport_report_created' && e.key === 'transport_report') ||
      (payload.event === 'service_rating_created' && e.key === 'service_rating')
    );

    if (!eventConfig?.enabled) {
      console.log('[notify-n8n] Event type not enabled:', payload.event);
      return new Response(
        JSON.stringify({ success: false, message: 'Event type not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build webhook payload with orchestrator context for N8N agent routing
    const callbackUrl = `${supabaseUrl}/functions/v1/n8n-callback`;
    const reportDataWithoutUserSeverity = { ...payload.report_data };
    // Remove severity definida pelo usuário - N8N é quem classifica
    delete (reportDataWithoutUserSeverity as any).severity;
    
    // Available tools in the orchestrator (for N8N reference)
    const availableTools = [
      'create_urban_report',
      'create_transport_report', 
      'create_service_rating',
      'search_knowledge_base',
      'find_nearby_services',
      'search_audiencias',
      'suggest_council_member',
      'get_citizen_history'
    ];
    
    const webhookPayload = {
      event: payload.event,
      timestamp: new Date().toISOString(),
      report: {
        id: payload.report_id,
        type: payload.report_type,
        severity_pending_classification: true, // Flag para N8N saber que deve classificar
        ...reportDataWithoutUserSeverity
      },
      user: {
        id: payload.user_id ? payload.user_id.substring(0, 8) + '...' : 'anonymous'
      },
      // Orchestrator context - enables N8N to mirror tool-based routing
      orchestrator: {
        source_tool: payload.source_tool || null,
        tool_arguments: payload.tool_arguments || null,
        tool_metadata: payload.tool_metadata || null,
        available_tools: availableTools
      },
      callback_url: callbackUrl,
      secret_key: settings.secret_key
    };

    console.log('[notify-n8n] Sending to webhook:', settings.webhook_url);

    // Log the outbound request
    const { data: logEntry } = await supabase
      .from('n8n_integration_logs')
      .insert({
        event_type: 'outbound',
        entity_type: payload.report_type,
        entity_id: payload.report_id,
        payload: webhookPayload,
        status: 'sent'
      })
      .select('id')
      .single();

    // Send to N8N webhook
    const webhookResponse = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.secret_key ? { 'X-N8N-Secret': settings.secret_key } : {})
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseStatus = webhookResponse.ok ? 'delivered' : 'failed';
    let responseBody = null;
    try {
      responseBody = await webhookResponse.json();
    } catch {
      responseBody = await webhookResponse.text();
    }

    console.log('[notify-n8n] Webhook response:', responseStatus, responseBody);

    // Update log with response
    if (logEntry?.id) {
      await supabase
        .from('n8n_integration_logs')
        .update({
          status: responseStatus,
          response: typeof responseBody === 'object' ? responseBody : { text: responseBody },
          error_message: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}`
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok, 
        status: responseStatus,
        log_id: logEntry?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-n8n] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
