/**
 * Importa routes.txt (GTFS SPTrans) para public.transport_lines.
 *
 * Uso:
 *   node scripts/sync-gtfs-routes.mjs "C:\Users\...\Downloads\_gtfs\routes.txt"
 *
 * Variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * DRY_RUN=1 — apenas conta, não grava
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  try {
    const content = readFileSync(resolve(ROOT, ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^\s*([^#=]+)=(.*)$/);
      if (m) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
    if (!process.env.SUPABASE_URL && process.env.CAMARA_URL) {
      process.env.SUPABASE_URL = process.env.CAMARA_URL;
    }
  } catch {
  }
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseRoutesTxt(filePath) {
  const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const idxShort = header.indexOf("route_short_name");
  const idxLong = header.indexOf("route_long_name");
  const idxType = header.indexOf("route_type");
  if (idxShort < 0 || idxLong < 0) {
    throw new Error("CSV precisa de route_short_name e route_long_name");
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const lineCode = cols[idxShort]?.trim();
    const lineName = cols[idxLong]?.trim();
    if (!lineCode || !lineName) continue;
    const routeType = idxType >= 0 ? cols[idxType]?.trim() : "3";
    const lineType = routeType === "3" ? "bus" : routeType === "1" ? "metro" : "bus";
    rows.push({ line_code: lineCode, line_name: lineName, line_type: lineType });
  }
  return rows;
}

async function main() {
  loadEnv();
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Uso: node scripts/sync-gtfs-routes.mjs <caminho/routes.txt>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const routes = parseRoutesTxt(filePath);
  console.log(`Linhas no GTFS: ${routes.length}`);

  if (process.env.DRY_RUN === "1") {
    console.log("DRY_RUN — amostra:", routes.slice(0, 5));
    return;
  }

  const supabase = createClient(url, key);
  const batchSize = 200;
  let upserted = 0;

  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize).map((r) => ({
      ...r,
      regions: [],
    }));
    const { error } = await supabase
      .from("transport_lines")
      .upsert(batch, { onConflict: "line_code" });
    if (error) {
      console.error("Erro no lote", i, error.message);
      process.exit(1);
    }
    upserted += batch.length;
    console.log(`Upsert ${upserted}/${routes.length}`);
  }

  console.log("Concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
