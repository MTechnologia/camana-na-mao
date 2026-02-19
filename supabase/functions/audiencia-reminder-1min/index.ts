/**
 * Lembrete 1 minuto antes: envia notificação para usuários inscritos em videoconferência
 * cuja audiência começa em aproximadamente 1 minuto (janela: 30s a 2 min).
 *
 * Deve ser invocado por cron às 16:04 para audiência às 16:05 (ex.: Frequency 4 16 * * *).
 * Para TESTE: use ?at=YYYY-MM-DDTHH:mm (ex.: ?at=2026-02-19T16:04) para simular "agora".
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/** BRT = UTC-3. Monta Date em BRT a partir de data (YYYY-MM-DD) e hora (HH:MM ou HH:MM:SS). */
function parseEventAtBRT(dataStr: string, horaStr: string | null): Date | null {
  if (!dataStr || typeof dataStr !== "string") return null;
  const datePart = dataStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  let timePart = "00:00";
  if (horaStr && typeof horaStr === "string") {
    const match = String(horaStr).match(/^(\d{1,2}):(\d{2})/);
    if (match) timePart = `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  const iso = `${datePart}T${timePart}:00-03:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

const WINDOW_MIN_MS = 30 * 1000;   // 30 segundos
const WINDOW_MAX_MS = 2 * 60 * 1000; // 2 minutos

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const atParam = url.searchParams.get("at");
    let now: Date;
    if (atParam && /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(atParam)) {
      now = new Date(atParam + (atParam.includes("-03:00") ? "" : "-03:00"));
      if (isNaN(now.getTime())) now = new Date();
    } else {
      now = new Date();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      .not("user_id", "is", null);

    if (errPart) {
      console.error("[audiencia-reminder-1min] Erro ao buscar participações:", errPart);
      return new Response(
        JSON.stringify({ success: false, error: errPart.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowMs = now.getTime();
    type P = { id?: string; user_id?: string; audiencia_id?: string; audiencias?: { data?: string; hora?: string; titulo?: string; local?: string } };
    const inWindow: Array<{ p: P; eventAt: Date }> = [];
    for (const p of (participacoes || []) as P[]) {
      const a = p.audiencias;
      const eventAt = parseEventAtBRT(a?.data ?? "", a?.hora ?? null);
      if (!eventAt) continue;
      const diff = eventAt.getTime() - nowMs;
      if (diff >= WINDOW_MIN_MS && diff <= WINDOW_MAX_MS) {
        inWindow.push({ p, eventAt });
      }
    }

    if (inWindow.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: "Nenhuma audiência na janela de 1 minuto.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jaEnviados = new Set<string>();
    const { data: existentes } = await supabase
      .from("notifications")
      .select("user_id, metadata")
      .eq("type", "audiencia_lembrete_1min")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

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

    for (const { p } of inWindow) {
      const userId = p.user_id as string;
      const audienciaId = p.audiencia_id as string;
      if (jaEnviados.has(`${userId}:${audienciaId}`)) continue;

      const a = p.audiencias;
      const titulo = a?.titulo || "Audiência Pública";
      const hora = a?.hora ? String(a.hora).slice(0, 5) : "";
      const msg = hora
        ? `Em 1 minuto: ${titulo.slice(0, 80)}. Horário: ${hora}. Acesse o app para o link.`
        : `Em 1 minuto: ${titulo.slice(0, 80)}. Acesse o app para mais detalhes.`;

      toInsert.push({
        user_id: userId,
        title: "Lembrete: audiência em 1 minuto",
        message: msg,
        type: "audiencia_lembrete_1min",
        action_url: `/audiencias/${audienciaId}`,
        priority: "high",
        metadata: { audiencia_id: audienciaId, user_id: userId, participacao_id: p.id },
      });
      jaEnviados.add(`${userId}:${audienciaId}`);
    }

    if (toInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Lembretes 1 min já enviados para esta janela." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: inserted, error: errInsert } = await supabase
      .from("notifications")
      .insert(toInsert)
      .select("id");

    if (errInsert) {
      console.error("[audiencia-reminder-1min] Erro ao inserir notificações:", errInsert);
      return new Response(
        JSON.stringify({ success: false, error: errInsert.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[audiencia-reminder-1min] ${inserted?.length ?? 0} lembretes 1 min enviados.`);
    return new Response(
      JSON.stringify({ success: true, sent: inserted?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[audiencia-reminder-1min]", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
