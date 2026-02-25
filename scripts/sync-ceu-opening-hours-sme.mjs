/**
 * Extrai horários de funcionamento dos CEUs no site da SME e atualiza public_services.
 * CEUs que não existem no GeoSampa são inseridos a partir dos dados do site (nome, endereço, horário).
 * Fonte: https://ceu.sme.prefeitura.sp.gov.br/unidades-ceus/
 *
 * Uso:
 *   node scripts/sync-ceu-opening-hours-sme.mjs
 *
 * Variáveis de ambiente:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (obrigatórias)
 *   VITE_GOOGLE_MAPS_API_KEY ou GOOGLE_MAPS_API_KEY (para geocodificar e inserir CEUs faltantes)
 *   DRY_RUN=1 (opcional; só loga, não grava no banco)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const LISTING_URL = "https://ceu.sme.prefeitura.sp.gov.br/unidades-ceus/";
const UNIT_URL_BASE = "https://ceu.sme.prefeitura.sp.gov.br/unidade/";

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

/** Remove acentos e normaliza para comparação. */
function normalize(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&#8211;/g, " ")
    .replace(/–|—/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mapa slug SME → palavras que aparecem no nome do banco (GeoSampa: CEU CEMEI/EMEF/CEI + nome).
 * Relação conferida com base no endereço (site SME x banco/Google).
 * CEUs sem entrada ou com [] não existem no GeoSampa (ex.: fundados 2025).
 */
const SLUG_TO_EXTRA_KEYWORDS = {
  "arthur-alvim": ["horizonte azul"], // CEU CEMEI HORIZONTE AZUL
  "barro-branco-cidade-tiradentes": ["barro branco"],
  "capao-redondo": ["elon macena"], // CEU CEI ELON MACENA
  carrao: ["monte serrat", "carrao"],
  heliopolis: ["heliopolis", "lagrimas", "campos salles"],
  "padre-ticao": [], // não consta no GeoSampa (fund. 2025)
  "papa-francisco": [], // não consta no GeoSampa (fund. 2025)
  "parque-novo-mundo": ["novo mundo", "ernesto augusto lopes", "leonidas"], // CEU CEMEI NOVO MUNDO
  "parque-veredas": ["anton makarenko", "daniel muller", "dona olivia"], // CEU EMEI ANTON MAKARENKO
  "rei-pele": [], // não consta no GeoSampa (fund. 2025)
  sapopemba: ["tatiana belinky"], // CEU EMEF TATIANA BELINKY
  "silvio-santos": [], // não consta no GeoSampa (fund. 2025)
  tiquatira: ["paulo freire", "condessa elisabeth", "robiano"], // CEU EMEI PAULO FREIRE PROF
};

/** Extrai slugs das páginas de CEU a partir do HTML da listagem. */
function extractSlugsFromListing(html) {
  const slugs = new Set();
  const regex = /ceu\.sme\.prefeitura\.sp\.gov\.br\/unidade\/ceu-([a-z0-9-]+)/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    slugs.add(m[1].toLowerCase());
  }
  return [...slugs];
}

/**
 * Extrai da listagem SME, por slug: nome do CEU, endereço, CEP e bairro (district).
 * Usado para inserir CEUs que não existem no GeoSampa.
 */
function parseListingEntries(html) {
  const map = {};
  // Blocos: <h2>CEU Nome</h2> seguido de <a href=".../ceu-SLUG/">Endereço - CEP: XXXXXXXX DRE ...</a>
  const blockRegex = /<h2[^>]*>([^<]+)<\/h2>\s*<a[^>]+href="[^"]*\/ceu-([a-z0-9-]+)\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let block;
  while ((block = blockRegex.exec(html)) !== null) {
    const name = block[1].trim().replace(/\s+/g, " ");
    const slug = block[2].toLowerCase();
    const linkText = block[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const cepMatch = linkText.match(/CEP:\s*(\d{8})/);
    const zipCode = cepMatch ? cepMatch[1] : null;
    const beforeCep = linkText.replace(/\s*CEP:\s*\d{8}.*$/i, "").trim();
    const parts = beforeCep.split(/\s+-\s+/).filter(Boolean);
    const address = beforeCep;
    const district = parts.length >= 2 ? parts[parts.length - 1].trim() : "São Paulo";
    map[slug] = { name, address, zip_code: zipCode, district };
  }
  // Fallback: links com /ceu-SLUG/ sem h2 anterior (estrutura HTML pode variar)
  const linkRegex = /<a[^>]*href="[^"]*\/ceu-([a-z0-9-]+)\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let link;
  while ((link = linkRegex.exec(html)) !== null) {
    const slug = link[1].toLowerCase();
    if (map[slug]) continue;
    const linkText = link[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const cepMatch = linkText.match(/CEP:\s*(\d{8})/);
    const zipCode = cepMatch ? cepMatch[1] : null;
    const beforeCep = linkText.replace(/\s*CEP:\s*\d{8}.*$/i, "").trim();
    const parts = beforeCep.split(/\s+-\s+/).filter(Boolean);
    map[slug] = { name: "", address: beforeCep, zip_code: zipCode, district: parts.length >= 2 ? parts[parts.length - 1].trim() : "São Paulo" };
  }
  return map;
}

/** Geocodifica endereço em São Paulo e retorna { latitude, longitude } ou null. */
async function geocodeAddress(address, zipCode, apiKey) {
  if (!apiKey) return null;
  const query = zipCode
    ? `${address}, ${zipCode}, São Paulo, SP, Brasil`
    : `${address}, São Paulo, SP, Brasil`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR`;
  const res = await fetch(url);
  const data = await res.json();
  const first = data?.results?.[0];
  if (!first?.geometry?.location) return null;
  const { lat, lng } = first.geometry.location;
  return { latitude: lat, longitude: lng };
}

/** Extrai nome da unidade (h1) e horário de funcionamento do HTML da página da unidade. */
function extractFromUnitPage(html) {
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const name = nameMatch ? nameMatch[1].trim().replace(/\s+/g, " ") : null;

  // Normaliza entidades HTML para facilitar o regex
  const normalized = html
    .replace(/&#243;|&#211;/g, "ó")
    .replace(/&#225;|&#193;/g, "á")
    .replace(/&oacute;|&Oacute;/g, "ó")
    .replace(/&aacute;|&Aacute;/g, "á");

  let horario = null;
  // Site SME: label "Funcionamento: </span>" e o horário no texto até </p>
  const afterSpan = html.match(/Funcionamento\s*:?\s*<\/span>\s*([\s\S]+?)<\/p>/i);
  if (afterSpan && afterSpan[1]) {
    horario = afterSpan[1].replace(/<[^>]+>/g, " ").trim().replace(/\s+/g, " ").trim();
  }
  if (!horario || horario.length < 15) {
    const normalized = html
      .replace(/&#243;|&#211;/g, "ó")
      .replace(/&#225;|&#193;/g, "á")
      .replace(/&oacute;|&Oacute;/g, "ó")
      .replace(/&aacute;|&Aacute;/g, "á");
    const patterns = [
      /Hor[aá]rio\s+de\s+Funcionamento\s*:?\s*([^<\n]+)/i,
      /Horario\s+de\s+Funcionamento\s*:?\s*([^<\n]+)/i,
      /Funcionamento\s*:?\s*<\/[^>]+>\s*[^>]*>([^<]+(?:Segunda|Sábado|Domingo|\d+h)[^<]*)/i,
    ];
    for (const re of patterns) {
      const m = normalized.match(re);
      if (m && m[1]) {
        horario = m[1].replace(/<[^>]+>/g, " ").trim().replace(/\s+/g, " ").trim();
        if (horario.length > 10 && /(\d+h|Segunda|Sábado|Domingo)/i.test(horario)) break;
        horario = null;
      }
    }
  }

  return { name, horario };
}

/** Retorna todos os ids em public_services que correspondem a esta unidade CEU (mesmo endereço/unidade). */
function findAllMatches(smeName, slug, dbCeus) {
  const normSme = normalize(smeName);
  const slugKey = slug.replace(/^ceu-/, ""); // "butanta", "agua-azul"
  const slugParts = slugKey.split("-").filter(Boolean);
  const ids = new Set();

  for (const row of dbCeus) {
    const normDb = normalize(row.name);
    const dbHasSlug = slugParts.length > 0 && slugParts.every((part) => normDb.includes(part));
    const smeNameInDb = normSme && normDb.includes(normSme.slice(0, 20));
    const dbNameInSme = normSme && normSme.includes(normDb.slice(0, 15));
    if (dbHasSlug || smeNameInDb || dbNameInSme) {
      ids.add(row.id);
      continue;
    }
    const extra = SLUG_TO_EXTRA_KEYWORDS[slugKey] || SLUG_TO_EXTRA_KEYWORDS[slug];
    if (extra && extra.some((kw) => normDb.includes(normalize(kw)))) ids.add(row.id);
  }
  return [...ids];
}

async function main() {
  loadEnv();
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("Buscando lista de CEUs no site da SME...");
  const listingRes = await fetch(LISTING_URL, {
    headers: { "User-Agent": "CamaraNaMao-SyncCEU/1.0" },
  });
  if (!listingRes.ok) {
    console.error("Erro ao acessar listagem:", listingRes.status, listingRes.statusText);
    process.exit(1);
  }
  const listingHtml = await listingRes.text();
  const slugs = extractSlugsFromListing(listingHtml);
  const listingMap = parseListingEntries(listingHtml);
  console.log(`Encontrados ${slugs.length} CEUs na listagem.`);

  const dbResult = await supabase
    .from("public_services")
    .select("id, name")
    .eq("service_type", "ceu");
  if (dbResult.error) {
    console.error("Erro ao buscar CEUs no banco:", dbResult.error.message);
    process.exit(1);
  }
  const dbCeus = dbResult.data || [];
  console.log(`${dbCeus.length} CEUs na base (public_services, service_type=ceu).`);

  const updates = [];
  const toInsert = [];
  let fetched = 0;

  for (const slug of slugs) {
    const url = `${UNIT_URL_BASE}ceu-${slug}/`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "CamaraNaMao-SyncCEU/1.0" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const { name, horario } = extractFromUnitPage(html);
      fetched++;
      if (!horario) {
        console.warn(`[${slug}] Sem horário na página`);
        if (process.env.DEBUG_CEU_HTML === "1") {
          const idx = html.indexOf("Funcionamento");
          const snippet = idx >= 0 ? html.slice(Math.max(0, idx - 200), idx + 500) : html.slice(0, 3000);
          const outPath = resolve(ROOT, "scripts", "debug-ceu-agua-azul.html");
          writeFileSync(outPath, snippet, "utf8");
          console.warn(`[DEBUG] Trecho do HTML salvo em ${outPath}`);
        }
        continue;
      }
      const serviceIds = findAllMatches(name || slug, slug, dbCeus);
      if (serviceIds.length > 0) {
        updates.push({ ids: serviceIds, name: name || slug, horario });
        continue;
      }
      const listingEntry = listingMap[slug];
      if (listingEntry && listingEntry.address && listingEntry.zip_code) {
        toInsert.push({
          slug,
          name: name || listingEntry.name,
          address: listingEntry.address,
          zip_code: listingEntry.zip_code,
          district: listingEntry.district || "São Paulo",
          horario,
        });
      } else {
        console.warn(`[${slug}] Nenhum match no banco e sem endereço na listagem: ${name || slug}`);
      }
    } catch (e) {
      console.warn(`[${slug}] Erro ao buscar:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const totalRecords = updates.reduce((acc, u) => acc + u.ids.length, 0);
  console.log(`\nExtraídos horários de ${fetched} páginas. ${updates.length} unidades com match (${totalRecords} registros no banco).`);
  if (toInsert.length > 0) {
    console.log(`${toInsert.length} CEU(s) sem match serão inseridos a partir do site da SME (nome, endereço, horário).`);
  }

  if (dryRun) {
    console.log("\n[DRY_RUN] Atualizações que seriam feitas (cada CEU pode ter vários registros):");
    updates.slice(0, 5).forEach((u) => console.log(" ", u.ids.length, "registros:", u.name?.slice(0, 40), "→", u.horario?.slice(0, 50)));
    if (updates.length > 5) console.log(" ... e mais", updates.length - 5, "unidades");
    console.log(`Total: ${totalRecords} registros.`);
    if (toInsert.length > 0) {
      console.log("\n[DRY_RUN] Inserções (CEUs do site SME):");
      toInsert.forEach((u) => console.log(" ", u.name?.slice(0, 50), "|", u.address?.slice(0, 50)));
    }
    return;
  }

  let ok = 0;
  for (const { ids, horario } of updates) {
    for (const id of ids) {
      const { error } = await supabase
        .from("public_services")
        .update({ opening_hours: { text: horario.slice(0, 500) } })
        .eq("id", id);
      if (error) {
        console.error("Erro ao atualizar", id, error.message);
      } else {
        ok++;
      }
    }
  }
  console.log(`\nAtualizados ${ok} registros com horário de funcionamento (${updates.length} unidades CEU).`);

  if (toInsert.length > 0) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("\nConfigure GOOGLE_MAPS_API_KEY ou VITE_GOOGLE_MAPS_API_KEY no .env para inserir CEUs faltantes (geocodificação).");
      toInsert.forEach((u) => console.warn("  Pendente:", u.name, "|", u.address));
      return;
    }
    let inserted = 0;
    for (const row of toInsert) {
      const coords = await geocodeAddress(row.address, row.zip_code, apiKey);
      if (!coords) {
        console.warn(`[${row.slug}] Geocodificação falhou: ${row.address?.slice(0, 60)}`);
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      const payload = {
        name: row.name.slice(0, 500),
        service_type: "ceu",
        address: row.address.slice(0, 500),
        district: row.district.slice(0, 200),
        city: "São Paulo",
        state: "SP",
        zip_code: row.zip_code,
        latitude: coords.latitude,
        longitude: coords.longitude,
        phone: null,
        opening_hours: { text: row.horario.slice(0, 500) },
        source_layer: "ceu_sme",
        external_id: row.slug,
      };
      const { error } = await supabase
        .from("public_services")
        .upsert(payload, { onConflict: "source_layer,external_id" });
      if (error) {
        console.error("Erro ao inserir", row.slug, error.message);
      } else {
        inserted++;
        console.log("Inserido:", row.name?.slice(0, 50));
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`\nInseridos ${inserted} CEU(s) a partir do site da SME.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
