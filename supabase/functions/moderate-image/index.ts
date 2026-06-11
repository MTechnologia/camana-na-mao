// Moderação de imagem com a OpenAI Moderation API (omni-moderation-latest, multimodal e
// gratuita). Chamada pelo cliente LOGO APÓS subir a imagem para o storage, ANTES de usá-la
// no relato/avatar. Se a imagem for reprovada, REMOVE o objeto do storage (service_role) e
// retorna { blocked: true }.
//
// FAIL-OPEN: se OPENAI_API_KEY não estiver configurada, ou a API falhar/timeout, NÃO bloqueia
// (retorna blocked:false, moderated:false) — moderação nunca derruba o fluxo de upload.
// Configure o secret OPENAI_API_KEY (Supabase → Edge Functions → Secrets) para ativar.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

// Categorias visuais que bloqueiam (omni-moderation). Foco no que faz sentido p/ imagem.
const BLOCK_CATEGORIES = ["sexual", "sexual/minors", "violence", "violence/graphic"];
const MODERATION_TIMEOUT_MS = 8000;

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("[moderate-image] Missing Supabase env");
      return json({ blocked: false, moderated: false }, 200, cors); // fail-open
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401, cors);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401, cors);

    const { bucket, path } = await req.json().catch(() => ({}));
    if (!bucket || !path || typeof bucket !== "string" || typeof path !== "string") {
      return json({ error: "bucket e path são obrigatórios" }, 400, cors);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Fail-open: sem chave, moderação fica desativada (não bloqueia nada).
    if (!openaiKey) {
      console.warn("[moderate-image] OPENAI_API_KEY ausente — moderação desativada (fail-open)");
      return json({ blocked: false, moderated: false }, 200, cors);
    }

    const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
    const imageUrl = pub?.publicUrl;
    if (!imageUrl) return json({ blocked: false, moderated: false }, 200, cors);

    let categories: string[] = [];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
      const res = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: [{ type: "image_url", image_url: { url: imageUrl } }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const t = await res.text();
        console.error("[moderate-image] OpenAI error", res.status, t.slice(0, 200));
        return json({ blocked: false, moderated: false }, 200, cors); // fail-open
      }
      const data = await res.json();
      const result = data?.results?.[0];
      const cats = (result?.categories ?? {}) as Record<string, boolean>;
      categories = BLOCK_CATEGORIES.filter((c) => cats[c] === true);
    } catch (e) {
      console.error("[moderate-image] moderation call failed", e instanceof Error ? e.message : e);
      return json({ blocked: false, moderated: false }, 200, cors); // fail-open
    }

    if (categories.length > 0) {
      // Conteúdo impróprio: remove do storage para não ficar acessível pela URL pública.
      const { error: rmErr } = await admin.storage.from(bucket).remove([path]);
      if (rmErr) console.error("[moderate-image] remove failed", rmErr.message);
      console.log(`[moderate-image] BLOCKED ${bucket}/${path} — categorias: ${categories.join(", ")}`);
      return json({ blocked: true, moderated: true, categories }, 200, cors);
    }

    return json({ blocked: false, moderated: true }, 200, cors);
  } catch (e) {
    console.error("[moderate-image] unexpected", e instanceof Error ? e.message : e);
    return json({ blocked: false, moderated: false }, 200, cors); // fail-open
  }
});
