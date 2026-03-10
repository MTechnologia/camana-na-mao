/**
 * Sincroniza slug e ap_code das audiências com a lista da CMSP.
 * Busca https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencias/ (e páginas),
 * extrai os links /audiencia/{slug}/, deriva a data do slug e atualiza as audiências
 * no Supabase que batem por data (e opcionalmente tema).
 *
 * Uso: node scripts/sync-audiencias-cmsp-slugs.mjs [páginas]
 *      páginas = número de páginas da listagem a buscar (default 5)
 *
 * Requer no .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CMSP_LIST_BASE = "https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencias";
const LINK_REGEX = /audienciaspublicas\/audiencia\/([^/"'\s]+)/gi;

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
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
    console.error("Aviso: .env não encontrado:", e.message);
  }
}

/**
 * Extrai data do slug no formato XX-dd-mm-yyyy ou XX-dd-mm-yyyy-19h
 * Retorna YYYY-MM-DD ou null.
 */
function dateFromSlug(slug) {
  const m = slug.match(/-(\d{2})-(\d{2})-(\d{4})(?:-\d+h)?$/);
  if (!m) return null;
  const [, day, month, year] = m;
  return `${year}-${month}-${day}`;
}

/**
 * Gera ap_code a partir do slug (formato Ninja: primeira parte em maiúsculas, ex: FIN02-26-02-2026).
 */
function slugToApCode(slug) {
  const idx = slug.indexOf("-");
  if (idx <= 0) return slug;
  const prefix = slug.slice(0, idx).toUpperCase();
  const rest = slug.slice(idx);
  return prefix + rest;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CamaraNaMao/1.0 (sync slugs)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/**
 * Extrai slugs únicos e suas datas a partir do HTML da listagem.
 */
function parseListingHtml(html) {
  const entries = [];
  let match;
  LINK_REGEX.lastIndex = 0;
  while ((match = LINK_REGEX.exec(html)) !== null) {
    const slug = match[1].replace(/\/$/, "");
    const data = dateFromSlug(slug);
    entries.push({ slug, data });
  }
  const bySlug = new Map();
  for (const e of entries) bySlug.set(e.slug, e);
  return Array.from(bySlug.values());
}

async function main() {
  loadEnv();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const numPages = Math.max(1, parseInt(process.argv[2], 10) || 5);
  console.log("Buscando até", numPages, "página(s) da listagem CMSP...");

  const allSlugs = [];
  for (let p = 1; p <= numPages; p++) {
    const url = p === 1 ? `${CMSP_LIST_BASE}/` : `${CMSP_LIST_BASE}/page/${p}/`;
    try {
      const html = await fetchPage(url);
      const entries = parseListingHtml(html);
      allSlugs.push(...entries);
      console.log("  Página", p, ":", entries.length, "slugs");
    } catch (e) {
      console.warn("  Página", p, "falhou:", e.message);
    }
  }

  const byData = new Map();
  for (const { slug, data } of allSlugs) {
    if (!data) continue;
    if (!byData.has(data)) byData.set(data, []);
    byData.get(data).push(slug);
  }
  console.log("Slugs por data:", byData.size, "datas únicas");

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: audiencias, error: selectError } = await supabase
    .from("audiencias")
    .select("id, data, tema, titulo, slug, ap_code")
    .is("slug", null);

  if (selectError) {
    console.error("Erro ao buscar audiências:", selectError.message);
    process.exit(1);
  }

  const toUpdate = [];
  for (const a of audiencias || []) {
    const dataStr = a.data; // YYYY-MM-DD
    const slugs = byData.get(dataStr);
    if (!slugs || slugs.length === 0) continue;
    const slug = slugs.length === 1 ? slugs[0] : slugs[0];
    toUpdate.push({
      id: a.id,
      slug,
      ap_code: slugToApCode(slug),
    });
  }

  if (toUpdate.length === 0) {
    console.log("Nenhuma audiência sem slug encontrada para atualizar.");
    return;
  }

  console.log("Atualizando", toUpdate.length, "audiência(s)...");
  let ok = 0;
  for (const row of toUpdate) {
    const { error } = await supabase
      .from("audiencias")
      .update({ slug: row.slug, ap_code: row.ap_code })
      .eq("id", row.id);
    if (error) console.warn("Erro ao atualizar", row.id, ":", error.message);
    else ok++;
  }
  console.log("Concluído. Atualizadas:", ok, "/", toUpdate.length);
}

main();
