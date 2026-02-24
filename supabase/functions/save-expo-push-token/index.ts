/**
 * Salva o token Expo Push do usuário em profiles.expo_push_token.
 * Chamada pelo frontend (WebView no app) com o JWT do usuário.
 * Usa service role para garantir que o update persista (evita problemas de RLS/WebView).
 * Mantida enxuta para evitar timeout: um decode do JWT (sem rede) + um update.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Decodifica o payload do JWT (Base64URL) para obter sub sem chamada de rede. Não verifica assinatura. */
function getSubFromJwt(jwt: string): string | null {
  try {
    const parts = jwt.trim().split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(decoded) as { sub?: string };
    return typeof obj.sub === "string" ? obj.sub : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "save-expo-push-token" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    // JWT: header (preferido) ou body.access_token (fallback para WebView/Android que às vezes não envia Authorization)
    const authHeader = req.headers.get("Authorization");
    const jwtFromHeader = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const jwtFromBody = typeof body?.access_token === "string" ? body.access_token.trim() : null;
    const jwt = jwtFromHeader || jwtFromBody;

    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = getSubFromJwt(jwt);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = typeof body?.token === "string" ? body.token.trim() : null;
    if (!token || !token.startsWith("ExponentPushToken")) {
      return new Response(
        JSON.stringify({ error: "Token Expo inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("id", userId);

    if (updateError) {
      console.error("[save-expo-push-token] update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Falha ao salvar token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[save-expo-push-token]", e);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
