import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * A3.6 — Warm-up das Edge Functions críticas.
 *
 * Funções de baixo tráfego (ex.: recommend-services, send-notification) sofrem
 * cold start (~0.8–0.9s) porque o Supabase recria o isolate Deno frio a cada
 * invocação. Esta função, chamada periodicamente pelo Cloud Scheduler, dispara
 * um OPTIONS barato em cada alvo — o que força o module-init e mantém o isolate
 * quente pelos próximos minutos, derrubando a latência da próxima chamada real.
 *
 * Auth: header `X-Cron-Secret: <CRON_SECRET>` (mesmo padrão da detect-anomalies).
 * Agendar a cada ~5 min em horário comercial. Ver _docs/warmup.md.
 */

/** Alvos priorizados: user-facing primeiro, depois server-side de baixo tráfego. */
const WARM_TARGETS = [
  "ai-orchestrator",
  "recommend-services",
  "send-notification",
  "send-web-push",
  "process-scheduled-notifications",
];

const WARM_TIMEOUT_MS = 20_000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  // Só o cron pode warmar (evita abuso/custo).
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  if (!cronSecret || !headerSecret || headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const base = Deno.env.get("SUPABASE_URL");
  if (!base) {
    return new Response(JSON.stringify({ status: "error", message: "SUPABASE_URL ausente" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const warmed = await Promise.all(
    WARM_TARGETS.map(async (fn) => {
      const start = Date.now();
      try {
        const res = await fetch(`${base}/functions/v1/${fn}`, {
          method: "OPTIONS",
          headers: {
            Origin: "https://warmup.internal",
            "Access-Control-Request-Method": "POST",
          },
          signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
        });
        return { fn, ms: Date.now() - start, ok: res.ok || res.status === 204 };
      } catch (err) {
        return { fn, ms: Date.now() - start, ok: false, error: String(err) };
      }
    }),
  );

  return new Response(JSON.stringify({ status: "success", warmed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
