/**
 * Verifica acesso a user_demographics e RPC de drill (admin).
 * Uso: node scripts/verify-demographic-drill.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(name) {
  try {
    const raw = readFileSync(resolve(process.cwd(), name), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([^=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(".env");
loadEnvFile(".env.e2e.local");

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!url || !key || !email || !password) {
  console.error("Missing VITE_SUPABASE_* or E2E_ADMIN_* in .env / .env.e2e.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) {
  console.error("Auth failed:", authErr.message);
  process.exit(1);
}
console.log("Logged in as", auth.user?.email);

const { count: demoCount, error: demoErr } = await supabase
  .from("user_demographics")
  .select("*", { count: "exact", head: true });
console.log("user_demographics visible rows (count):", demoCount, demoErr?.message ?? "ok");

const { data: rpc, error: rpcErr } = await supabase.rpc("get_demographic_drill_reports", {
  p_dimension: "gender",
  p_values: ["feminino"],
  p_start_date: null,
  p_end_date: null,
});
if (rpcErr) {
  console.log("RPC get_demographic_drill_reports:", rpcErr.message);
} else {
  const urban = rpc?.urban?.length ?? 0;
  const transport = rpc?.transport?.length ?? 0;
  const evals = rpc?.evaluation_count ?? 0;
  console.log("RPC feminino:", { urban, transport, evaluationCount: evals, total: urban + transport + evals });
}

const { data: rpcRace, error: rpcRaceErr } = await supabase.rpc("get_demographic_drill_reports", {
  p_dimension: "race",
  p_values: ["parda"],
  p_start_date: null,
  p_end_date: null,
});
if (rpcRaceErr) {
  console.log("RPC race parda:", rpcRaceErr.message);
} else {
  console.log("RPC parda:", {
    urban: rpcRace?.urban?.length ?? 0,
    transport: rpcRace?.transport?.length ?? 0,
    evaluationCount: rpcRace?.evaluation_count ?? 0,
  });
}
