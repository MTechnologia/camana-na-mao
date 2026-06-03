#!/usr/bin/env node
/**
 * A3.6 — Mede o cold start (latência da 1ª invocação) das Edge Functions críticas.
 *
 * Estratégia: para cada função, dispara um OPTIONS (preflight CORS, sem auth).
 * Como o isolate Deno só executa o handler DEPOIS de inicializar o módulo
 * (imports de topo), o tempo do OPTIONS numa função fria inclui o module-init —
 * ou seja, aproxima o custo de cold start. Mede 1ª (provável fria) vs 2ª (quente).
 *
 * Uso:
 *   node scripts/measure-edge-cold-start.mjs
 *   (lê CAMARA_URL / VITE_SUPABASE_URL do .env)
 */
import { readFileSync } from "node:fs";

function readEnvUrl() {
  if (process.env.CAMARA_URL) return process.env.CAMARA_URL;
  if (process.env.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^(?:CAMARA_URL|VITE_SUPABASE_URL)\s*=\s*"?([^"\r\n]+)"?/);
      if (m) return m[1].trim();
    }
  } catch {
    /* ignore */
  }
  throw new Error("Defina CAMARA_URL ou VITE_SUPABASE_URL (ou .env).");
}

/** Funções críticas (IA + notificações + user-facing) — ajuste conforme necessário. */
const CRITICAL_FUNCTIONS = [
  "ai-orchestrator",
  "send-notification",
  "send-web-push",
  "process-scheduled-notifications",
  "detect-anomalies",
  "recommend-services",
  "google-places-autocomplete",
];

async function timeOptions(url) {
  const start = performance.now();
  try {
    await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    return { ms: null, error: String(err) };
  }
  return { ms: Math.round(performance.now() - start) };
}

async function main() {
  const base = readEnvUrl().replace(/\/$/, "");
  console.log(`Cold start (OPTIONS) — base: ${new URL(base).host}\n`);
  console.log(`${"função".padEnd(34)} ${"1ª (fria)".padStart(10)} ${"2ª (quente)".padStart(12)}`);
  console.log("-".repeat(60));
  for (const fn of CRITICAL_FUNCTIONS) {
    const u = `${base}/functions/v1/${fn}`;
    const cold = await timeOptions(u);
    const warm = await timeOptions(u);
    const c = cold.ms == null ? `ERR` : `${cold.ms}ms`;
    const w = warm.ms == null ? `ERR` : `${warm.ms}ms`;
    const flag = cold.ms != null && cold.ms > 800 ? "  ⚠ cold start alto" : "";
    console.log(`${fn.padEnd(34)} ${c.padStart(10)} ${w.padStart(12)}${flag}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
