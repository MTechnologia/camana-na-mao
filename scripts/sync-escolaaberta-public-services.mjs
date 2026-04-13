/**
 * Sincroniza public_services com a API Escola Aberta (SME).
 * Fonte: https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1/api/livroaberto_escolas/
 * Inclui escolas municipais e CEUs com nome, endereço, CEP, telefone e coordenadas.
 *
 * Uso:
 *   node scripts/sync-escolaaberta-public-services.mjs
 *
 * Variáveis de ambiente:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (obrigatórias)
 *   ESCOLA_ABERTA_API_TOKEN (opcional; o gateway pode exigir token - ver API Store)
 *   DRY_RUN=1 (opcional; só loga, não grava)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { fetchWithRetry, formatFetchError } from "./escola-aberta-http.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ESCOLA_ABERTA_BASE = "https://gateway.apilib.prefeitura.sp.gov.br/sme/EscolaAberta/v1";
const LIVROABERTO_ESCOLAS_PATH = "/api/livroaberto_escolas/";

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

function get(obj, ...keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return typeof v === "string" ? v.trim() : v;
  }
  return null;
}

/**
 * Decide se o registro é CEU (Centro Educacional Unificado) ou escola.
 * Baseado em modelo EscolasEscolas: tipoesc, nomesc, ceu.
 */
function isCeu(row) {
  const nome = (get(row, "nomesc", "nome", "name") || "").toUpperCase();
  const tipo = (get(row, "tipoesc", "tipo") || "").toUpperCase();
  const ceuField = get(row, "ceu");
  if (ceuField && String(ceuField).trim() !== "") return true;
  if (nome.includes("CEU")) return true;
  if (tipo.includes("CEU")) return true;
  return false;
}

/**
 * Converte um item da API livroaberto_escolas em linha para public_services.
 * Campos do modelo Django: codesc, tipoesc, nomesc, ceu, endereco, numero, bairro, cep, tel1, latitude, longitude, distrito.
 */
function rowToService(item, index) {
  const name = get(item, "nomesc", "nome", "name");
  if (!name) return null;

  const lat = item.latitude != null ? Number(item.latitude) : null;
  const lng = item.longitude != null ? Number(item.longitude) : null;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const endereco = get(item, "endereco", "endereço", "address");
  const numero = get(item, "numero", "number");
  const addressParts = [endereco, numero].filter(Boolean);
  const address = addressParts.length ? addressParts.join(", ") : "Endereço não informado";
  const district = get(item, "bairro", "distrito", "district", "subpref") || "São Paulo";
  const zipCode = item.cep != null ? String(item.cep).replace(/\D/g, "").slice(0, 8) : null;
  const phone = get(item, "tel1", "tel2", "telefone", "phone");
  const tipoesc = get(item, "tipoesc", "tipo");
  const servicesOffered = tipoesc ? `Tipo: ${tipoesc}` : null;

  const externalId = get(item, "codesc", "cd_cie", "codinep", "id") || `escola_aberta_${index}`;
  const serviceType = isCeu(item) ? "ceu" : "school";

  return {
    name: name.slice(0, 500),
    service_type: serviceType,
    address: address.slice(0, 500),
    district: district.slice(0, 200),
    city: "São Paulo",
    state: "SP",
    zip_code: zipCode || null,
    latitude: lat,
    longitude: lng,
    phone: phone ? phone.slice(0, 50) : null,
    services_offered: servicesOffered ? servicesOffered.slice(0, 500) : null,
    source_layer: "escola_aberta",
    external_id: externalId,
  };
}

async function fetchLivroAbertoEscolas(token) {
  const url = `${ESCOLA_ABERTA_BASE}${LIVROABERTO_ESCOLAS_PATH}`;
  const headers = {
    "Accept": "application/json",
    "User-Agent": "CamaraNaMao-SyncEscolaAberta/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetchWithRetry(url, { headers });
  if (!res.ok) {
    throw new Error(`API Escola Aberta: ${res.status} ${res.statusText}. ${res.status === 401 ? "Verifique ESCOLA_ABERTA_API_TOKEN no .env (API Store pode exigir inscrição/token)." : ""}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data && typeof data === "object" && !Array.isArray(data)) return [data];
  return [];
}

async function main() {
  loadEnv();
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiToken = process.env.ESCOLA_ABERTA_API_TOKEN || process.env.ESCOLA_ABERTA_TOKEN;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  console.log("Buscando dados em", ESCOLA_ABERTA_BASE + LIVROABERTO_ESCOLAS_PATH);
  let rows;
  try {
    rows = await fetchLivroAbertoEscolas(apiToken);
  } catch (e) {
    console.error(formatFetchError(e));
    console.warn(
      "Se o erro for de rede (timeout, ECONNRESET, etc.), o gateway da Prefeitura pode bloquear ou limitar IPs fora do Brasil — nesse caso rode o workflow em self-hosted runner na rede permitida ou agende o mesmo script no GCP (Cloud Run/Scheduler).",
    );
    if (!apiToken) {
      console.warn("Dica: o gateway pode exigir token. Inscreva-se na API no API Store e defina ESCOLA_ABERTA_API_TOKEN no .env.");
    }
    process.exit(1);
  }

  console.log(`Recebidos ${rows.length} registro(s) da API.`);

  const services = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rowToService(rows[i], i);
    if (row) services.push(row);
  }
  console.log(`Mapeados ${services.length} para public_services (com coordenadas válidas).`);
  const ceuCount = services.filter((s) => s.service_type === "ceu").length;
  const schoolCount = services.length - ceuCount;
  console.log(`  CEUs: ${ceuCount} | Escolas: ${schoolCount}`);

  if (dryRun) {
    console.log("\n[DRY_RUN] Amostra (primeiros 3):");
    services.slice(0, 3).forEach((s) => console.log(" ", s.service_type, s.name?.slice(0, 50), "|", s.address?.slice(0, 40)));
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const BATCH = 50;
  let ok = 0;
  for (let i = 0; i < services.length; i += BATCH) {
    const chunk = services.slice(i, i + BATCH);
    const { error } = await supabase
      .from("public_services")
      .upsert(chunk, { onConflict: "source_layer,external_id", ignoreDuplicates: false });
    if (error) {
      console.error("Erro no upsert (lote", Math.floor(i / BATCH) + 1, "):", error.message);
    } else {
      ok += chunk.length;
    }
  }
  console.log(`\nUpsert concluído: ${ok} registros (source_layer=escola_aberta).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
