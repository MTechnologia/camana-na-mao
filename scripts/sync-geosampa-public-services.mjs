/**
 * Sincroniza public_services com camadas GeoJSON do GeoSampa (ou URLs configuradas).
 * Usado para manter equipamentos (pontos de ônibus, escolas rede privada, etc.) atualizados.
 *
 * Uso:
 *   node scripts/sync-geosampa-public-services.mjs
 *
 * Config: variável GEOSAMPA_LAYERS_JSON (JSON array) ou arquivo scripts/geosampa-layers.json
 * Cada item: { "url": "https://...geojson ou file path", "service_type": "other"|"school"|..., "source_layer": "ponto_onibus" }
 *
 * Variáveis de ambiente:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (obrigatórias)
 *   GEOSAMPA_LAYERS_JSON (opcional; se ausente, lê geosampa-layers.json)
 *   DRY_RUN=1 (opcional; só loga, não insere)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SERVICE_TYPES = ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"];

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

function getLayersConfig() {
  const jsonEnv = process.env.GEOSAMPA_LAYERS_JSON;
  if (jsonEnv) {
    try {
      return JSON.parse(jsonEnv);
    } catch (e) {
      console.error("GEOSAMPA_LAYERS_JSON inválido:", e.message);
      process.exit(1);
    }
  }
  const configPath = resolve(__dirname, "geosampa-layers.json");
  if (!existsSync(configPath)) {
    console.error("Defina GEOSAMPA_LAYERS_JSON ou crie scripts/geosampa-layers.json com array de { url, service_type, source_layer }");
    process.exit(1);
  }
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function getProp(obj, ...keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

function extractPoint(feature) {
  const g = feature?.geometry;
  if (!g || g.type !== "Point" || !Array.isArray(g.coordinates)) return null;
  const [lng, lat] = g.coordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Gera external_id estável para o feature (GeoSampa costuma ter id ou fid em properties). */
function getExternalId(feature, fallbackIndex) {
  const id = feature?.id ?? getProp(feature?.properties, "id", "fid", "OBJECTID", "gid");
  if (id != null) return String(id);
  return `feature_${fallbackIndex}`;
}

/** Converte um feature GeoJSON em linha para public_services. */
function featureToRow(feature, layerConfig, index) {
  const point = extractPoint(feature);
  if (!point) return null;

  const props = feature?.properties ?? {};
  const name = getProp(props, "nome", "name", "NOME", "NAME", "nome_equip") ?? getExternalId(feature, index);
  const address = getProp(props, "endereco", "endereço", "address", "ENDERECO", "endereco_c") ?? "Endereço não informado";
  const district = getProp(props, "distrito", "district", "DISTRITO", "bairro", "ds_subpref", "subprefeitura") ?? "São Paulo";

  const serviceType = SERVICE_TYPES.includes(layerConfig.service_type) ? layerConfig.service_type : "other";

  return {
    name: name.slice(0, 500),
    service_type: serviceType,
    address: address.slice(0, 500),
    district: district.slice(0, 200),
    city: "São Paulo",
    state: "SP",
    latitude: point.lat,
    longitude: point.lng,
    source_layer: layerConfig.source_layer,
    external_id: getExternalId(feature, index),
  };
}

/** Garante que URLs WFS do GeoSampa peçam coordenadas em WGS84 (lat/lon). */
function ensureWfsWgs84(url) {
  const u = url.trim();
  if (!u.includes("wfs") || !u.includes("GetFeature")) return u;
  if (/srsName=/i.test(u)) return u;
  const sep = u.includes("?") && !u.endsWith("?") ? "&" : "?";
  return u + sep + "srsName=EPSG:4326";
}

async function fetchGeoJSON(urlOrPath) {
  const u = urlOrPath.trim();
  if (u.startsWith("file://") || (!u.startsWith("http://") && !u.startsWith("https://"))) {
    const path = u.startsWith("file://") ? u.slice(7) : resolve(ROOT, u);
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw);
  }
  const fetchUrl = ensureWfsWgs84(u);
  const res = await fetch(fetchUrl, { headers: { "Accept": "application/geo+json, application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${fetchUrl}`);
  return res.json();
}

const BATCH = 200;

async function main() {
  loadEnv();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const layers = getLayersConfig();
  if (!Array.isArray(layers) || layers.length === 0) {
    console.error("Nenhuma camada configurada em GEOSAMPA_LAYERS_JSON ou geosampa-layers.json");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const layer of layers) {
    const { url, service_type, source_layer } = layer;
    if (!url || !source_layer) {
      console.warn("Camada ignorada (falta url ou source_layer):", layer);
      continue;
    }
    console.log(`[${source_layer}] Buscando ${url.slice(0, 60)}...`);

    let geojson;
    try {
      geojson = await fetchGeoJSON(url);
    } catch (e) {
      console.error(`[${source_layer}] Erro ao buscar GeoJSON:`, e.message);
      continue;
    }

    const features = geojson?.features ?? [];
    const rows = [];
    for (let i = 0; i < features.length; i++) {
      const row = featureToRow(features[i], { service_type: service_type ?? "other", source_layer }, i);
      if (row) rows.push(row);
    }

    console.log(`[${source_layer}] ${rows.length} features válidos`);

    if (dryRun) {
      console.log("[DRY_RUN] Primeira linha exemplo:", rows[0]);
      totalSkipped += rows.length;
      continue;
    }

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("public_services")
        .upsert(chunk, { onConflict: "source_layer,external_id", ignoreDuplicates: false });

      if (error) {
        console.error(`[${source_layer}] Erro no lote ${i / BATCH + 1}:`, error.message);
        totalSkipped += chunk.length;
        continue;
      }
      totalInserted += chunk.length;
    }
  }

  console.log("Sync concluído. Inseridos/atualizados:", totalInserted, "Ignorados/erro:", totalSkipped);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
