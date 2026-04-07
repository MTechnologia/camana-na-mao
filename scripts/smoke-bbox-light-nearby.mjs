/**
 * Smoke: compara RPC search_public_services_bbox_light vs GET em public_services
 * no mesmo bbox grande (ex. 5 km em SP). Uso: `node scripts/smoke-bbox-light-nearby.mjs`
 * Carrega .env na raiz (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const box = {
  min_lat: -23.62998705874955,
  max_lat: -23.540155941250447,
  min_lng: -46.74714446598189,
  max_lng: -46.64912553401811,
};
const lim = 48;

function splitFour(b) {
  const midLat = (b.min_lat + b.max_lat) / 2;
  const midLng = (b.min_lng + b.max_lng) / 2;
  return [
    { min_lat: b.min_lat, max_lat: midLat, min_lng: b.min_lng, max_lng: midLng },
    { min_lat: b.min_lat, max_lat: midLat, min_lng: midLng, max_lng: b.max_lng },
    { min_lat: midLat, max_lat: b.max_lat, min_lng: b.min_lng, max_lng: midLng },
    { min_lat: midLat, max_lat: b.max_lat, min_lng: midLng, max_lng: b.max_lng },
  ];
}

async function main() {
  console.log("1) RPC bbox completo (ubs)…");
  const t0 = Date.now();
  const { data: rpcRows, error: rpcErr } = await supabase.rpc("search_public_services_bbox_light", {
    min_lat: box.min_lat,
    max_lat: box.max_lat,
    min_lng: box.min_lng,
    max_lng: box.max_lng,
    service_types: ["ubs"],
    result_limit: lim,
    result_offset: 0,
  });
  console.log(`   ${Date.now() - t0} ms`, rpcErr ? `ERRO: ${rpcErr.message}` : `OK, ${rpcRows?.length ?? 0} linhas`);

  console.log("2) RPC 4 quadrantes (ubs, 12 cada)…");
  const t1 = Date.now();
  const perQ = Math.max(1, Math.ceil(lim / 4));
  const ids = new Set();
  for (const q of splitFour(box)) {
    const { data: rows, error: e } = await supabase.rpc("search_public_services_bbox_light", {
      ...q,
      service_types: ["ubs"],
      result_limit: perQ,
      result_offset: 0,
    });
    if (e) console.log("   quad ERRO:", e.message);
    else (rows ?? []).forEach((r) => ids.add(r.id));
  }
  console.log(`   ${Date.now() - t1} ms, ids únicos: ${ids.size}`);

  console.log("3) REST public_services (ubs, limit)…");
  const t2 = Date.now();
  const { data: restRows, error: restErr } = await supabase
    .from("public_services")
    .select("id")
    .gte("latitude", box.min_lat)
    .lte("latitude", box.max_lat)
    .gte("longitude", box.min_lng)
    .lte("longitude", box.max_lng)
    .eq("service_type", "ubs")
    .limit(lim);
  console.log(`   ${Date.now() - t2} ms`, restErr ? `ERRO: ${restErr.message}` : `OK, ${restRows?.length ?? 0} linhas`);

  if (!rpcErr) process.exit(0);
  if (ids.size > 0) {
    console.log("\nBbox cheio falhou, mas quadrantes retornaram dados (estratégia do app).");
    process.exit(0);
  }
  if (restErr) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
