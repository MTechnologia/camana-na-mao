import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

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
  source_tool?: string;
  tool_arguments?: Record<string, unknown>;
  tool_metadata?: {
    called_at: string;
    orchestrator_version: string;
  };
}

interface N8NSettings {
  webhook_url: string;
  secret_key: string | null;
  enabled_events: Array<{ key: string; enabled: boolean }>;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// Available tools in the orchestrator (for N8N reference)
const AVAILABLE_TOOLS = [
  'create_urban_report',
  'create_transport_report',
  'create_service_rating',
  'search_knowledge_base',
  'find_nearby_services',
  'search_audiencias',
  'suggest_council_member',
  'get_citizen_history'
];

function buildWebhookPayload(payload: NotifyPayload, callbackUrl: string) {
  const reportDataWithoutUserSeverity = { ...payload.report_data };
  delete (reportDataWithoutUserSeverity as Record<string, unknown>).severity;

  return {
    event: payload.event,
    timestamp: new Date().toISOString(),
    report: {
      id: payload.report_id,
      type: payload.report_type,
      severity_pending_classification: true,
      ...reportDataWithoutUserSeverity
    },
    user: {
      id: payload.user_id ? payload.user_id.substring(0, 8) + '...' : 'anonymous'
    },
    orchestrator: {
      source_tool: payload.source_tool || null,
      tool_arguments: payload.tool_arguments || null,
      tool_metadata: payload.tool_metadata || null,
      available_tools: AVAILABLE_TOOLS
    },
    callback_url: callbackUrl
    // secret_key removed from body - only sent in header for security
  };
}

async function updateLogStatus(
  supabase: SupabaseClient,
  logId: string,
  status: string,
  response?: unknown,
  errorMessage?: string | null
) {
  if (!logId) return;
  
  try {
    await supabase
      .from('n8n_integration_logs')
      .update({
        status,
        response: response ? (typeof response === 'object' ? response : { text: response }) : null,
        error_message: errorMessage || null
      } as Record<string, unknown>)
      .eq('id', logId);
  } catch (error) {
    console.error('[notify-n8n] Failed to update log:', error);
  }
}

async function processWebhookWithRetry(
  supabase: SupabaseClient,
  settings: N8NSettings,
  webhookPayload: Record<string, unknown>,
  logId: string
) {
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[notify-n8n] Attempt ${attempt}/${MAX_RETRIES} to send webhook`);
      
      await updateLogStatus(supabase, logId, attempt === 1 ? 'processing' : 'retrying');

      const response = await fetch(settings.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.secret_key ? { 'X-N8N-Secret': settings.secret_key } : {})
        },
        body: JSON.stringify(webhookPayload)
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }

      if (response.ok) {
        console.log('[notify-n8n] Webhook delivered successfully');
        await updateLogStatus(supabase, logId, 'delivered', responseBody);
        return;
      }

      lastError = `HTTP ${response.status}: ${typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)}`;
      console.warn(`[notify-n8n] Attempt ${attempt} failed:`, lastError);

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[notify-n8n] Attempt ${attempt} error:`, lastError);
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[notify-n8n] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  console.error('[notify-n8n] All retry attempts exhausted. Event failed.');
  await updateLogStatus(supabase, logId, 'failed', null, lastError);
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

    // Build webhook payload
    const callbackUrl = `${supabaseUrl}/functions/v1/n8n-callback`;
    const webhookPayload = buildWebhookPayload(payload, callbackUrl);

    console.log('[notify-n8n] Queueing webhook for:', settings.webhook_url);

    // Create log entry with 'queued' status
    const { data: logEntry, error: logError } = await supabase
      .from('n8n_integration_logs')
      .insert({
        event_type: 'outbound',
        entity_type: payload.report_type,
        entity_id: payload.report_id,
        payload: webhookPayload,
        status: 'queued'
      })
      .select('id')
      .single();

    if (logError) {
      console.error('[notify-n8n] Failed to create log entry:', logError);
    }

    // Fire-and-forget: Process webhook in background
    EdgeRuntime.waitUntil(
      processWebhookWithRetry(
        supabase,
        settings as N8NSettings,
        webhookPayload,
        logEntry?.id || ''
      )
    );

    // Return immediately with 'queued' status
    return new Response(
      JSON.stringify({
        success: true,
        status: 'queued',
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
