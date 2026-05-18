// HU-11.1 — Edge function: convida novo usuário por email.
//
// Recebe POST com:
//   { email: string, role: 'admin'|'gestor'|'vereador'|'assessor'|'cidadao_engajado'|'cidadao',
//     fullName?: string, councilMemberId?: string }
//
// Fluxo:
//   1. Valida que o solicitante é admin (via JWT + role check).
//   2. Chama supabase.auth.admin.inviteUserByEmail para criar o usuário e
//      enviar email de convite (template gerenciado no Dashboard do Supabase).
//   3. Atribui o role via tabela user_roles.
//   4. Se vereador/assessor + councilMemberId, cria registro em vereador_user_links.
//   5. Retorna { user_id, email }.
//
// Idempotência: se o email já existe, retorna erro 409 com user_id existente.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface InvitePayload {
  email: string;
  role: 'admin' | 'gestor' | 'vereador' | 'assessor' | 'cidadao_engajado' | 'cidadao';
  fullName?: string;
  councilMemberId?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Variáveis de ambiente ausentes.' }, 500);
    }

    // Verifica que o solicitante é admin.
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized: missing bearer token' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'Unauthorized: invalid token' }, 401);
    }

    const callerId = userData.user.id;
    const { data: hasPerm, error: permErr } = await userClient.rpc(
      'has_permission',
      { _user_id: callerId, _permission_key: 'users.invite' },
    );
    if (permErr) {
      console.error('[invite-user] has_permission error', permErr);
      return json({ error: 'Falha ao validar permissão.' }, 500);
    }
    if (!hasPerm) {
      return json({ error: 'Forbidden: requires users.invite' }, 403);
    }

    // Lê payload.
    const payload = (await req.json()) as InvitePayload;
    if (!payload?.email || !payload?.role) {
      return json({ error: 'email e role são obrigatórios' }, 400);
    }

    // Validação básica do email.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return json({ error: 'email inválido' }, 400);
    }

    const allowedRoles = [
      'admin',
      'gestor',
      'vereador',
      'assessor',
      'cidadao_engajado',
      'cidadao',
    ];
    if (!allowedRoles.includes(payload.role)) {
      return json({ error: `role inválido: ${payload.role}` }, 400);
    }

    // Cliente admin para criar usuário.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // URL para a qual o usuário será redirecionado após clicar no link do
    // email. Cai numa página que pede senha + completa o perfil ANTES de
    // ele acessar o app normal.
    //
    // Como o mesmo projeto Supabase atende múltiplos ambientes (dev/hml/prod),
    // detectamos o ambiente que disparou o convite pelo header `Origin` da
    // request. Cada ambiente Cloud Run envia seu próprio Origin, então o
    // link no email leva o usuário de volta ao mesmo ambiente.
    //
    // Fallback (sem Origin): usa env SITE_URL ou o origin da request.
    // IMPORTANTE: todas as URLs precisam estar registradas em
    // Authentication → URL Configuration → Redirect URLs do Supabase
    // (use wildcard `/**` para liberar deep links).
    const origin = req.headers.get('origin')?.trim();
    const siteUrl =
      origin && /^https?:\/\//.test(origin)
        ? origin
        : (Deno.env.get('SITE_URL') ?? new URL(req.url).origin);
    const redirectTo = `${siteUrl}/completar-convite`;

    const inviteMetadata = {
      full_name: payload.fullName ?? null,
      invited_by: callerId,
      invited_role: payload.role,
      invited_council_member_id: payload.councilMemberId ?? null,
    };

    const sendInvite = () =>
      adminClient.auth.admin.inviteUserByEmail(payload.email, {
        data: inviteMetadata,
        redirectTo,
      });

    let inviteStatus: 'success' | 'resent' = 'success';

    // Convite por email (cria user em status 'invited').
    const inviteResult = await sendInvite();
    let inviteData = inviteResult.data;
    let inviteErr = inviteResult.error;

    if (inviteErr) {
      console.error('[invite-user] inviteUserByEmail error', inviteErr);
      const msg = inviteErr.message ?? '';
      const lower = msg.toLowerCase();
      const alreadyExists =
        lower.includes('already') || lower.includes('user already registered');

      if (alreadyExists) {
        const existing = await findAuthUserByEmail(
          supabaseUrl,
          serviceRoleKey,
          anonKey,
          payload.email,
        );

        if (existing?.email_confirmed_at) {
          return json(
            {
              error:
                'Este e-mail já possui conta ativa. Peça para a pessoa fazer login ou use "Esqueci a senha".',
              user_id: existing.id,
            },
            409,
          );
        }

        if (existing?.id) {
          // Convite pendente: remove usuário não confirmado e reenvia convite.
          const { error: delErr } = await adminClient.auth.admin.deleteUser(existing.id);
          if (delErr) {
            console.error('[invite-user] delete pending user error', delErr);
            return json(
              {
                error:
                  'Este e-mail já foi convidado, mas não foi possível reenviar o convite. Exclua o usuário em Gestão de Usuários e tente de novo.',
              },
              409,
            );
          }
          const retry = await sendInvite();
          if (retry.error) {
            const retryMsg = retry.error.message ?? 'Falha ao reenviar convite.';
            return json({ error: retryMsg }, 409);
          }
          inviteData = retry.data;
          inviteErr = null;
          inviteStatus = 'resent';
        }

        return json(
          {
            error: 'Este e-mail já tem cadastro no sistema.',
            raw: msg,
          },
          409,
        );
      }

      // Mapeia outros erros conhecidos do Supabase Auth.
      let status = 500;
      let friendly = msg || 'Falha ao enviar convite.';
      if (lower.includes('rate limit') || (inviteErr as { code?: string }).code === 'over_email_send_rate_limit') {
        status = 429;
        friendly = 'Limite de envio de emails atingido. Aguarde alguns minutos antes de tentar novamente, ou configure SMTP customizado no Supabase.';
      } else if (lower.includes('invalid') && lower.includes('email')) {
        status = 400;
        friendly = 'Email inválido segundo o provedor de autenticação.';
      }
      return json({ error: friendly, raw: msg }, status);
    }

    const newUserId = inviteData?.user?.id;
    if (!newUserId) {
      return json({ error: 'Convite enviado mas user_id não retornado.' }, 500);
    }

    // Atribui role.
    //
    // O trigger handle_new_user já inseriu user_roles com 'cidadao'.
    // A constraint UNIQUE(user_id) impede um segundo INSERT.
    // Solução: DELETE então INSERT (em vez de UPSERT) para garantir
    // que o role atribuído pelo admin sobrescreva o default.
    const { error: delErr } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', newUserId);
    if (delErr) {
      console.error('[invite-user] delete default role error', delErr);
    }

    const { error: roleErr } = await adminClient
      .from('user_roles')
      .insert({ user_id: newUserId, role: payload.role });
    if (roleErr) {
      console.error('[invite-user] role insert error', roleErr);
      // Não desfaz o convite — o user existe e admin pode setar role manualmente.
      return json(
        {
          warning: 'Convite enviado mas role não foi atribuído. Defina manualmente.',
          user_id: newUserId,
        },
        207,
      );
    }

    // Se vereador/assessor com gabinete, vincula.
    if (
      payload.councilMemberId
      && (payload.role === 'vereador' || payload.role === 'assessor')
    ) {
      const { error: linkErr } = await adminClient
        .from('vereador_user_links')
        .insert({
          user_id: newUserId,
          council_member_id: payload.councilMemberId,
          role: payload.role,
        });
      if (linkErr) {
        console.warn('[invite-user] vereador_user_links failed', linkErr);
      }
    }

    return json({
      status: inviteStatus,
      user_id: newUserId,
      email: payload.email,
      role: payload.role,
    });
  } catch (err) {
    console.error('[invite-user] unexpected', err);
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

type AuthUserRow = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
};

/** Busca usuário em auth.users pelo e-mail (GoTrue admin filter). */
async function findAuthUserByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  anonKey: string,
  email: string,
): Promise<AuthUserRow | null> {
  const filter = encodeURIComponent(`email.eq.${email.trim()}`);
  const url = `${supabaseUrl}/auth/v1/admin/users?filter=${filter}&per_page=1`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: anonKey,
      },
    });
    if (!res.ok) {
      console.warn('[invite-user] findAuthUserByEmail HTTP', res.status);
      return null;
    }
    const body = await res.json() as { users?: AuthUserRow[] };
    const users = body?.users ?? [];
    return users.length > 0 ? users[0] : null;
  } catch (e) {
    console.warn('[invite-user] findAuthUserByEmail failed', e);
    return null;
  }
}
