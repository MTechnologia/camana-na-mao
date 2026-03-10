/**
 * Detecta visita a serviço público com base em (user_id, latitude, longitude).
 * Usado pelo app mobile em background via expo-location + expo-task-manager.
 *
 * Lógica: Haversine para public_services; se dist < 50m, atualiza visit_detection_state;
 * após 10 min no mesmo serviço → cria service_visit e INSERT em notifications.
 *
 * Autenticação: Authorization: Bearer <jwt> (decode do sub para user_id, igual save-expo-push-token).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEOFENCE_RADIUS_M = 50;
const MIN_DWELL_MINUTES = 10;
const MIN_DWELL_MS = MIN_DWELL_MINUTES * 60 * 1000;

/** Haversine: distância em metros entre dois pontos */
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Nome para exibição: se name for ID técnico (ponto_onibus.fid--...), usa "Ponto de ônibus - {endereço}". */
function getServiceDisplayName(name: string, address?: string | null, district?: string | null): string {
  const n = (name ?? "").trim();
  const isTechnicalId = /ponto_onibus\.fid--|\.fid--[a-f0-9_]+$/i.test(n) ||
    (n.startsWith("Ponto de Onibus ") && n.includes("fid--"));
  if (isTechnicalId) {
    const addr = (address ?? "").trim();
    const addrOk = addr && !/endere[cç]o\s*nao?\s*informado/i.test(addr);
    const suffix = [addrOk ? addr : null, (district ?? "").trim()].filter(Boolean)[0];
    return suffix ? `Ponto de ônibus – ${suffix}` : "Ponto de ônibus";
  }
  return n || "Serviço";
}

/** Decodifica o payload do JWT para obter sub (user_id). Não verifica assinatura. */
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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "").trim();
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

    const body = await req.json().catch(() => ({}));
    const lat = typeof body?.latitude === "number" ? body.latitude : null;
    const lng = typeof body?.longitude === "number" ? body.longitude : null;
    if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "latitude e longitude obrigatórios e válidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Buscar serviços próximos (approx bounding box para performance, depois filtrar com Haversine)
    const degPerKm = 1 / 111; // ~1 grau ≈ 111km
    const delta = (GEOFENCE_RADIUS_M / 1000) * degPerKm * 2;
    const { data: services, error: svcError } = await supabase
      .from("public_services")
      .select("id, name, address, district, latitude, longitude")
      .gte("latitude", lat - delta)
      .lte("latitude", lat + delta)
      .gte("longitude", lng - delta)
      .lte("longitude", lng + delta);

    if (svcError) {
      console.error("[detect-service-visit] public_services error:", svcError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar serviços" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    let visitId: string | null = null;

    for (const svc of services ?? []) {
      const slat = Number(svc.latitude);
      const slng = Number(svc.longitude);
      const dist = distanceMeters(lat, lng, slat, slng);
      if (dist > GEOFENCE_RADIUS_M) continue;

      // Dentro do geofence: upsert visit_detection_state
      const { data: existing } = await supabase
        .from("visit_detection_state")
        .select("first_seen_at")
        .eq("user_id", userId)
        .eq("service_id", svc.id)
        .maybeSingle();

      const firstSeenAt = existing?.first_seen_at ?? now;
      if (!existing) {
        await supabase.from("visit_detection_state").upsert(
          {
            user_id: userId,
            service_id: svc.id,
            first_seen_at: firstSeenAt,
            updated_at: now,
          },
          { onConflict: "user_id,service_id" }
        );
      } else {
        await supabase
          .from("visit_detection_state")
          .update({ updated_at: now })
          .eq("user_id", userId)
          .eq("service_id", svc.id);
      }

      const elapsed = Date.now() - new Date(firstSeenAt).getTime();
      if (elapsed < MIN_DWELL_MS) continue;

      // Verificar se já existe service_visit recente (evitar duplicatas)
      const { data: recentVisit } = await supabase
        .from("service_visits")
        .select("id")
        .eq("user_id", userId)
        .eq("service_id", svc.id)
        .gte("visited_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (recentVisit) {
        await supabase
          .from("visit_detection_state")
          .delete()
          .eq("user_id", userId)
          .eq("service_id", svc.id);
        continue;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: newVisit, error: insertError } = await supabase
        .from("service_visits")
        .insert({
          user_id: userId,
          service_id: svc.id,
          expires_at: expiresAt.toISOString(),
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[detect-service-visit] service_visits insert:", insertError);
        continue;
      }

      visitId = newVisit?.id ?? null;
      if (visitId) {
        await supabase.from("visit_detection_state").delete().eq("user_id", userId).eq("service_id", svc.id);

        const displayName = getServiceDisplayName(svc.name, svc.address, svc.district);
        await supabase.from("notifications").insert({
          user_id: userId,
          title: `Você visitou ${displayName}`,
          message: "Gostaria de avaliar este serviço?",
          action_url: `/avaliar/${visitId}`,
          type: "visita_servico",
          priority: "default",
        });
      }
      break; // Só criamos uma visita por chamada
    }

    return new Response(
      JSON.stringify({
        ok: true,
        visit_id: visitId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[detect-service-visit]", e);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
