/**
 * Lembrete D-1: envia notificação para usuários inscritos em videoconferência
 * cuja audiência é amanhã (data = CURRENT_DATE + 1).
 *
 * Deve ser invocado por cron (ex.: diariamente às 08:00 BRT).
 * Para TESTE: use ?for_date=YYYY-MM-DD (ex.: ?for_date=2026-02-26) para simular
 * "amanhã" = essa data e disparar o lembrete para audiências nesse dia.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

/** "Amanhã" em BRT (America/Sao_Paulo) para evitar bug quando cron roda à noite UTC. */
function getAmanhaBRT(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const forDateParam = url.searchParams.get("for_date");
    let targetDateStr: string;
    if (forDateParam && /^\d{4}-\d{2}-\d{2}$/.test(forDateParam)) {
      targetDateStr = forDateParam;
    } else {
      targetDateStr = getAmanhaBRT();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: audienciasAmanha, error: errAud } = await supabase
      .from("audiencias")
      .select("id")
      .eq("data", targetDateStr);
    if (errAud) {
      console.error("[audiencia-reminder-d1] Erro ao buscar audiências:", errAud);
      return new Response(
        JSON.stringify({ success: false, error: errAud.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const idsAmanha = (audienciasAmanha || []).map((a: { id: string }) => a.id);
    if (idsAmanha.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: forDateParam
            ? `Nenhuma audiência em ${targetDateStr} com inscritos.`
            : "Nenhuma audiência amanhã com inscritos.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: participacoes, error: errPart } = await supabase
      .from("audiencia_participacoes")
      .select(`
        id,
        user_id,
        audiencia_id,
        audiencias (
          titulo,
          data,
          hora,
          local
        )
      `)
      .eq("tipo", "videoconferencia")
      .not("user_id", "is", null)
      .in("audiencia_id", idsAmanha);

    if (errPart) {
      console.error("[audiencia-reminder-d1] Erro ao buscar participações:", errPart);
      return new Response(
        JSON.stringify({ success: false, error: errPart.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jaEnviados = new Set<string>();
    const { data: existentes } = await supabase
      .from("notifications")
      .select("user_id, metadata")
      .eq("type", "audiencia_lembrete_d1")
      .gte("created_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

    for (const n of existentes || []) {
      const uid = n.user_id;
      const mid = (n.metadata as Record<string, string>)?.audiencia_id;
      if (mid && uid) jaEnviados.add(`${uid}:${mid}`);
    }

    const toInsert: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      action_url: string;
      priority: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const p of participacoes || []) {
      const userId = p.user_id as string;
      const audienciaId = p.audiencia_id as string;
      if (jaEnviados.has(`${userId}:${audienciaId}`)) continue;

      const a = p.audiencias as { titulo?: string; data?: string; hora?: string; local?: string };
      const titulo = a?.titulo || "Audiência Pública";
      const hora = a?.hora ? String(a.hora).slice(0, 5) : "";
      const msg = hora
        ? `Amanhã é o dia: ${titulo.slice(0, 80)}. Horário: ${hora}. Acesse o app para o link.`
        : `Amanhã é o dia: ${titulo.slice(0, 80)}. Acesse o app para mais detalhes.`;

      toInsert.push({
        user_id: userId,
        title: "Lembrete: audiência amanhã",
        message: msg,
        type: "audiencia_lembrete_d1",
        action_url: `/audiencias/${audienciaId}`,
        priority: "normal",
        metadata: { audiencia_id: audienciaId, user_id: userId, participacao_id: p.id },
      });
      jaEnviados.add(`${userId}:${audienciaId}`);
    }

    if (toInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Lembretes já enviados para hoje." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: inserted, error: errInsert } = await supabase
      .from("notifications")
      .insert(toInsert)
      .select("id");

    if (errInsert) {
      console.error("[audiencia-reminder-d1] Erro ao inserir notificações:", errInsert);
      return new Response(
        JSON.stringify({ success: false, error: errInsert.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[audiencia-reminder-d1] ${inserted?.length ?? 0} lembretes D-1 enviados.`);
    return new Response(
      JSON.stringify({ success: true, sent: inserted?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[audiencia-reminder-d1]", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
