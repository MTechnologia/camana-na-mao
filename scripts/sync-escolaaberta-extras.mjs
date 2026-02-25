/**
 * Sincroniza dados extras da API Escola Aberta:
 * - tipo_escola → escola_aberta_tipos (catálogo para filtros/rótulos)
 * - ambientesbyescola/{codesc} → public_services.ambientes (por unidade)
 * - smeambientes → escola_aberta_rede_ambientes (totais da rede; opcional por DRE)
 *
 * Uso: node scripts/sync-escolaaberta-extras.mjs
 * Requer: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ESCOLA_ABERTA_API_TOKEN (se a API exigir)
 * Opcional: DRY_RUN=1
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ESCOLA_ABERTA_BASE = "https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1";

function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  try {
    let content = readFileSync(envPath, "utf8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^\s*([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim().replace(/\r/g, "");
        const value = m[2].trim().replace(/\r/g, "").replace(/^["']|["']$/g, "");
        process.env[key] = value;
      }
    }
    if (!process.env.SUPABASE_URL && process.env.CAMARA_URL)
      process.env.SUPABASE_URL = process.env.CAMARA_URL;
  } catch (e) {
    console.warn("Aviso: .env não encontrado -", e.message);
  }
}

function apiHeaders(token) {
  const h = { Accept: "application/json", "User-Agent": "CamaraNaMao-SyncEscolaAberta/1.0" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function apiGet(path, token) {
  const url = `${ESCOLA_ABERTA_BASE}${path}`;
  const res = await fetch(url, { headers: apiHeaders(token) });
  if (!res.ok) return { ok: false, status: res.status, data: null };
  const data = await res.json();
  return { ok: true, data };
}

function extractResults(data) {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

async function main() {
  loadEnv();
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.ESCOLA_ABERTA_API_TOKEN || process.env.ESCOLA_ABERTA_TOKEN;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ---- 1. Tipo de escola (catálogo) ----
  console.log("1. Sincronizando tipo_escola → escola_aberta_tipos...");
  const tipoRes = await apiGet("/api/tipo_escola/", token);
  if (!tipoRes.ok) {
    console.warn("   Falha ao buscar tipo_escola:", tipoRes.status);
  } else {
    const list = extractResults(tipoRes.data);
    const tipos = list
      .map((r) => r.tipoesc ?? r.tipo)
      .filter(Boolean)
      .map((t) => ({ tipoesc: String(t).trim() }));
    if (tipos.length > 0 && !dryRun) {
      await supabase.from("escola_aberta_tipos").delete().neq("tipoesc", "__none__");
      const { error } = await supabase.from("escola_aberta_tipos").upsert(tipos, { onConflict: "tipoesc" });
      if (error) console.warn("   Erro ao gravar tipos:", error.message);
      else console.log("   Gravados", tipos.length, "tipos.");
    } else if (dryRun) {
      console.log("   [DRY_RUN] Seriam gravados", tipos.length, "tipos.");
    }
  }

  // ---- 2. Ambientes por escola ----
  console.log("\n2. Sincronizando ambientes por escola → public_services.ambientes...");
  const { data: escolas } = await supabase
    .from("public_services")
    .select("id, external_id")
    .eq("source_layer", "escola_aberta")
    .not("external_id", "is", null);
  const list = escolas || [];
  let ambientesOk = 0;
  for (const row of list) {
    const codesc = row.external_id;
    const res = await apiGet(`/api/ambientesbyescola/${codesc}/`, token);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }
    const arr = extractResults(res.data);
    const ambientes = Array.isArray(arr) ? arr.map((a) => ({ ambiente: a.ambiente ?? a.descamb, total: a.total ?? 0 })).filter((a) => a.ambiente != null) : [];
    if (!dryRun) {
      const { error } = await supabase.from("public_services").update({ ambientes: ambientes.length ? ambientes : null }).eq("id", row.id);
      if (!error) ambientesOk++;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!dryRun) console.log("   Atualizados", ambientesOk, "de", list.length, "unidades com ambientes.");
  else console.log("   [DRY_RUN] Seriam atualizadas", list.length, "unidades.");

  // ---- 3. Totais da rede (smeambientes) ----
  console.log("\n3. Sincronizando smeambientes → escola_aberta_rede_ambientes...");
  const smeRes = await apiGet("/api/smeambientes/", token);
  if (!smeRes.ok) {
    console.warn("   Falha ao buscar smeambientes:", smeRes.status);
  } else {
    const redeList = extractResults(smeRes.data);
    const rows = redeList
      .filter((r) => r.ambiente != null)
      .map((r) => ({ ambiente: String(r.ambiente).trim(), total: Number(r.total) || 0, cod_dre: null }));
    if (rows.length > 0 && !dryRun) {
      await supabase.from("escola_aberta_rede_ambientes").delete().is("cod_dre", null);
      const { error } = await supabase.from("escola_aberta_rede_ambientes").insert(rows);
      if (error) console.warn("   Erro ao gravar rede ambientes:", error.message);
      else console.log("   Gravados", rows.length, "totais da rede.");
    } else if (dryRun) {
      console.log("   [DRY_RUN] Seriam gravados", rows.length, "totais da rede.");
    }
  }

  // Opcional: smeambientes por DRE (ex.: BT = Butantã)
  const dreCodes = process.env.ESCOLA_ABERTA_DRE_CODES ? process.env.ESCOLA_ABERTA_DRE_CODES.split(",").map((s) => s.trim()) : [];
  for (const cod of dreCodes) {
    const dreRes = await apiGet(`/api/smeambientes/${cod}/`, token);
    if (!dreRes.ok) continue;
    const dreList = extractResults(dreRes.data);
    const dreRows = dreList
      .filter((r) => r.ambiente != null)
      .map((r) => ({ ambiente: String(r.ambiente).trim(), total: Number(r.total) || 0, cod_dre: cod }));
    if (dreRows.length > 0 && !dryRun) {
      await supabase.from("escola_aberta_rede_ambientes").delete().eq("cod_dre", cod);
      await supabase.from("escola_aberta_rede_ambientes").insert(dreRows);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (dreCodes.length) console.log("   DREs processados:", dreCodes.join(", "));

  console.log("\nConcluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
