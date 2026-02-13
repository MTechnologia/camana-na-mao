import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_AGE_MINUTES = 30; // só aceitar conclusão de cadastro para usuário criado nos últimos 30 min

function mapIncomeToSocialClass(incomeRange: string): string | null {
  const mapping: Record<string, string> = {
    ate_2sm: "E",
    "2_a_4sm": "D",
    "4_a_10sm": "C",
    acima_10sm: "AB",
  };
  return mapping[incomeRange] || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Configuração do servidor incompleta" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: {
    userId: string;
    fullName: string;
    phone: string | null;
    birthDate: string | null;
    gender: string | null;
    race: string | null;
    incomeRange: string;
    cep: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    interests: string[];
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    userId,
    fullName,
    phone,
    birthDate,
    gender,
    race,
    incomeRange,
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    interests,
  } = body;

  if (!userId || typeof fullName !== "string") {
    return new Response(JSON.stringify({ error: "userId e fullName são obrigatórios" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Só permitir concluir cadastro para usuário criado recentemente (evita abuso)
  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) {
    return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const createdAt = authUser.user.created_at ? new Date(authUser.user.created_at) : null;
  if (createdAt) {
    const limit = new Date(Date.now() - MAX_AGE_MINUTES * 60 * 1000);
    if (createdAt < limit) {
      return new Response(
        JSON.stringify({ error: "Janela de conclusão do cadastro expirada. Faça login e complete em Perfil." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  try {
    // 1) Perfil
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        full_name: (fullName || "Usuário").trim(),
        phone: phone?.trim() || null,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (profileErr) {
      console.error("complete-registration profiles:", profileErr);
      return new Response(
        JSON.stringify({ error: "Não foi possível salvar o perfil", details: profileErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Dados demográficos
    const socialClass = mapIncomeToSocialClass(incomeRange || "");
    const { error: demoErr } = await admin.from("user_demographics").upsert(
      {
        user_id: userId,
        birth_date: birthDate || null,
        gender: gender === "prefiro_nao_dizer" ? null : gender || null,
        race: race === "prefiro_nao_dizer" ? null : race || null,
        social_class: socialClass,
      },
      { onConflict: "user_id" }
    );
    if (demoErr) {
      console.error("complete-registration user_demographics:", demoErr);
      return new Response(
        JSON.stringify({ error: "Não foi possível salvar dados demográficos", details: demoErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Endereço (obrigatório no fluxo)
    if (cep && neighborhood && number?.trim()) {
      const { error: addrErr } = await admin.from("user_addresses").insert({
        user_id: userId,
        street: street || "",
        number: number.trim(),
        complement: complement?.trim() || null,
        neighborhood,
        city: city || "São Paulo",
        state: state || "SP",
        zip_code: (cep || "").replace(/\D/g, ""),
        is_primary: true,
      });
      if (addrErr) {
        console.error("complete-registration user_addresses:", addrErr);
        return new Response(
          JSON.stringify({ error: "Não foi possível salvar o endereço", details: addrErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4) Interesses
    if (Array.isArray(interests) && interests.length > 0) {
      const rows = interests.map((interest_category: string) => ({ user_id: userId, interest_category }));
      const { error: intErr } = await admin.from("user_interests").insert(rows);
      if (intErr) {
        console.error("complete-registration user_interests:", intErr);
        return new Response(
          JSON.stringify({ error: "Não foi possível salvar interesses", details: intErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5) Preferências de notificação
    await admin.from("notification_settings").upsert(
      {
        user_id: userId,
        push_enabled: true,
        email_enabled: true,
        sms_enabled: false,
        newsletter_enabled: false,
      },
      { onConflict: "user_id" }
    );

    // 6) Notificação de boas-vindas
    await admin.from("notifications").insert({
      user_id: userId,
      title: "Bem-vindo(a) à Câmara Municipal!",
      message:
        "Agora você pode acompanhar audiências públicas, fazer relatos de transporte e urbanos, ver serviços perto de você e muito mais. Acesse o menu para explorar.",
      type: "system",
      priority: "normal",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("complete-registration unexpected:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao concluir cadastro", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
