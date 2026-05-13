// HU-12.4 — Edge function: arquivamento de audit_logs > 12 meses.
//
// Executada diariamente via Cloud Scheduler. Chama a RPC purge_old_audit_logs
// que move os registros antigos para audit_logs_archive e deleta da tabela
// principal (com bypass temporário da imutabilidade).
//
// Auth: aceita header X-Cron-Secret (cron) OU JWT de admin (botão manual).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

async function authorize(
  req: Request,
  supabaseUrl: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const cronSecret = Deno.env.get('CRON_SECRET')?.trim();
  const headerSecret = req.headers.get('x-cron-secret')?.trim();
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return { ok: true };
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!anonKey) return { ok: false, status: 500, message: 'SUPABASE_ANON_KEY ausente' };
    try {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return { ok: false, status: 401, message: 'JWT inválido' };
      }
      const { data: roles } = await userClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id);
      const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === 'admin');
      if (!isAdmin) return { ok: false, status: 403, message: 'Apenas admin' };
      return { ok: true };
    } catch (err) {
      console.error('[archive-audit-logs] auth check error', err);
      return { ok: false, status: 401, message: 'Falha ao validar JWT' };
    }
  }

  return { ok: false, status: 401, message: 'Unauthorized' };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    return json({ error: 'SUPABASE_URL ausente' }, 500);
  }

  const authz = await authorize(req, supabaseUrl);
  if (!authz.ok) {
    return json({ error: authz.message }, authz.status);
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, 500);

    let retentionMonths = 12;
    try {
      if (req.headers.get('content-type')?.includes('application/json')) {
        const body = await req.json();
        if (Number.isFinite(body?.retention_months) && body.retention_months >= 1) {
          retentionMonths = Math.floor(Number(body.retention_months));
        }
      }
    } catch (_e) {
      // body opcional
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient.rpc('purge_old_audit_logs', {
      _retention_months: retentionMonths,
    });

    if (error) {
      console.error('[archive-audit-logs] rpc error', error);
      return json({ error: error.message }, 500);
    }

    return json({ status: 'success', result: data });
  } catch (err) {
    console.error('[archive-audit-logs] unexpected', err);
    const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
    return json({ error: msg }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
