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

const SERVICE_TYPES = ["ubs", "school", "ceu", "hospital", "library", "sports_center", "theater", "museum", "community_center", "park", "street_market", "market", "city_market", "social_assistance", "transit_station", "bicycle", "subprefeitura", "police_station", "cemetery", "accessibility", "recycling_point", "fire_station", "other"];

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
    if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL)
      process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CAMARA_SERVICE_ROLE_KEY)
      process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.CAMARA_SERVICE_ROLE_KEY;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
      process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
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

/**
 * Converte um texto de "status" vindo do GeoSampa para os valores do app.
 * Retorna null quando não for possível inferir.
 *
 * Valores esperados no banco: 'open' | 'closed' | 'maintenance'
 */
function inferOperationalStatus(rawStatus) {
  const raw = typeof rawStatus === "string" ? rawStatus.trim() : "";
  const s = raw.toLowerCase();
  if (!s) return null;

  // Manutenção (inclui variações de escrita e sinais de indisponibilidade)
  if (
    /manuten[cç][aã]o/.test(s) ||
    /manutenc/.test(s) ||
    /paralisad[oa]/.test(s) ||
    /paralis/.test(s) ||
    /parad[oa]/.test(s) ||
    /interromp/.test(s) ||
    /indispon[ií]vel/.test(s) ||
    /fora\s+de\s+opera[cç][aã]o/.test(s)
  ) {
    return "maintenance";
  }

  // Fechado/encerrado/inativo
  if (
    /fechad[oa]/.test(s) ||
    /encerrad[oa]/.test(s) ||
    /inativad[oa]/.test(s) ||
    /desativad[oa]/.test(s) ||
    /fora\s+de\s+opera[cç][aã]o/.test(s) ||
    /sem\s+funcionamento/.test(s)
  ) {
    return "closed";
  }

  // Aberto/em operação/em funcionamento
  if (
    /abert[oa]/.test(s) ||
    /em\s+opera[cç][aã]o/.test(s) ||
    /em\s+funcionamento/.test(s) ||
    /operand[oa]/.test(s) ||
    /operacional/.test(s) ||
    /funcionando/.test(s)
  ) {
    return "open";
  }

  return null;
}

/** Calcula centroide aproximado de um anel [lng, lat][] (média). */
function ringCentroid(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sumLng = 0, sumLat = 0, n = 0;
  for (const p of ring) {
    if (Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number") {
      sumLng += p[0];
      sumLat += p[1];
      n++;
    }
  }
  if (n === 0) return null;
  return { lng: sumLng / n, lat: sumLat / n };
}

function extractPoint(feature) {
  const g = feature?.geometry;
  if (!g || !Array.isArray(g.coordinates)) return null;

  if (g.type === "Point") {
    const [lng, lat] = g.coordinates;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  if (g.type === "Polygon") {
    const ring = g.coordinates[0];
    const c = ringCentroid(ring);
    if (!c || c.lat < -90 || c.lat > 90 || c.lng < -180 || c.lng > 180) return null;
    return { lat: c.lat, lng: c.lng };
  }

  if (g.type === "MultiPolygon") {
    const firstRing = g.coordinates[0]?.[0];
    const c = firstRing ? ringCentroid(firstRing) : null;
    if (!c || c.lat < -90 || c.lat > 90 || c.lng < -180 || c.lng > 180) return null;
    return { lat: c.lat, lng: c.lng };
  }

  return null;
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
  const name = getProp(props, "nome", "name", "NOME", "NAME", "nm_equipamento", "nome_equip", "nm_area",
    "nm_estabelecimento", "nm_central_intermediacao_libra", "nm_local", "nm_ecoponto", "nm_ponto_onibus",
    "nm_estacao_transbordo", "nm_cooperativa", "nm_estacao_metro_trem", "nm_terminal", "nm_aterro_sanitario",
    "nm_servico", "nm_entidade", "nm_shopping_center", "nm_sede", "nm_subprefeitura", "ds_subprefeitura") ?? getExternalId(feature, index);
  const address = getProp(
    props,
    "endereco", "endereço", "address", "ENDERECO", "tx_endereco_equipamento", "endereco_c",
    "tx_endereco", "ds_endereco", "logradouro", "tx_logradouro", "endereco_completo",
    "nm_endereco", "tx_endereco_ponto_onibus", "endereco1"
  ) ?? "Endereço não informado";
  const district = getProp(props, "distrito", "district", "DISTRITO", "nm_bairro_equipamento", "nm_bairro", "bairro", "ds_subpref", "subprefeitura", "nm_distrito", "nm_subprefeitura", "nm_prefeitura_regional") ?? "São Paulo";
  const phone = getProp(props, "tx_numero_telefone", "tx_telefone", "nr_telefone", "telefone", "phone", "TELEFONE");
  const openingHoursRaw = getProp(
    props,
    "tx_horario_funcionamento", "horario_funcionamento", "opening_hours", "horario",
    "tx_horario", "horario_abertura", "ds_horario", "horario_funcionamento", "tx_atendimento"
  );

  // Inferir status operacional (aberto/fechado/manutenção) a partir de campos do GeoSampa.
  // Fazemos isso independentemente do texto "services_offered" para não depender de fallback.
  let operationalStatus = null;
  if (layerConfig.source_layer === "estacao_metro" || layerConfig.source_layer === "estacao_trem") {
    operationalStatus = inferOperationalStatus(getProp(props, "tx_situacao_metro_trem"));
  }
  if (layerConfig.source_layer === "terminal_onibus") {
    operationalStatus = inferOperationalStatus(getProp(props, "tx_status_terminal"));
  }
  if (layerConfig.source_layer === "aterro_sanitario") {
    operationalStatus = inferOperationalStatus(getProp(props, "tx_status_aterro_sanitario"));
  }

  let servicesOffered = getProp(props, "tx_tipo_equipamento", "tx_classe_equipamento", "servicos_ofertados", "services_offered", "description", "tx_descricao");
  if (!servicesOffered && layerConfig.source_layer === "ecoponto") {
    const comum = getProp(props, "tx_recebimento_comum");
    const difer = getProp(props, "tx_recebimento_diferenciado");
    const tipo = getProp(props, "tx_tipo_recebimento");
    const parts = [comum, difer, tipo].filter(Boolean);
    if (parts.length > 0) servicesOffered = parts.join(". ");
  }
  if (!servicesOffered && (layerConfig.source_layer === "estacao_metro" || layerConfig.source_layer === "estacao_trem")) {
    const linha = getProp(props, "nm_linha_metro_trem");
    const empresa = getProp(props, "nm_empresa_metro_trem");
    const status = getProp(props, "tx_situacao_metro_trem");
    const parts = [linha, empresa, status].filter(Boolean);
    if (parts.length > 0) servicesOffered = parts.join(". ");
  }
  if (!servicesOffered && layerConfig.source_layer === "terminal_onibus") {
    const tipo = getProp(props, "nm_tipo_terminal");
    const status = getProp(props, "tx_status_terminal");
    const parts = [tipo, status].filter(Boolean);
    if (parts.length > 0) servicesOffered = parts.join(". ");
  }
  if (!servicesOffered && layerConfig.source_layer === "sede_subprefeitura") {
    servicesOffered = "Sede administrativa da subprefeitura. Atendimento ao cidadão.";
  }
  if (!servicesOffered && layerConfig.source_layer === "bicicletario_paraciclo") {
    const tipo = getProp(props, "tx_tipo_equipamento");
    const vagas = props.qt_vaga != null ? `${props.qt_vaga} vagas` : null;
    const org = getProp(props, "nm_orgao_responsavel");
    const parts = [tipo, vagas, org].filter(Boolean);
    if (parts.length > 0) servicesOffered = parts.join(". ");
  }
  if (!servicesOffered && layerConfig.source_layer === "aterro_sanitario") {
    const status = getProp(props, "tx_status_aterro_sanitario");
    const conc = getProp(props, "nm_concessionaria");
    const parts = [status, conc].filter(Boolean);
    if (parts.length > 0) servicesOffered = parts.join(". ");
  }
  if (!servicesOffered && layerConfig.source_layer === "praca_largo") {
    const area = props.area_metro != null && Number(props.area_metro) > 0
      ? `${Number(props.area_metro).toLocaleString("pt-BR")} m²`
      : null;
    const cat = getProp(props, "categoria");
    const parts = [cat, area].filter(Boolean);
    if (parts.length > 0) servicesOffered = parts.join(". ");
  }
  if (!servicesOffered && layerConfig.source_layer === "parques_unidades_conservacao") {
    const parts = [];
    const tipo = getProp(props, "tx_tipo_categoria");
    const situacao = getProp(props, "tx_situacao");
    const admin = getProp(props, "nm_administrador");
    const area = props.qt_area_metro != null && Number(props.qt_area_metro) > 0
      ? `${Number(props.qt_area_metro).toLocaleString("pt-BR")} m²`
      : null;
    const diploma = getProp(props, "tx_instrumento_legal_criacao");
    if (tipo) parts.push(tipo);
    if (situacao) parts.push(situacao);
    if (admin) parts.push(`Gestão: ${admin}`);
    if (area) parts.push(`Área: ${area}`);
    if (diploma) parts.push(`Criação: ${diploma}`);
    if (parts.length > 0) servicesOffered = parts.join(". ");
  }

  const serviceType = SERVICE_TYPES.includes(layerConfig.service_type) ? layerConfig.service_type : "other";

  const capacityParts = [];
  const qtyVaga = props.qt_vaga != null && Number(props.qt_vaga) >= 0 ? Number(props.qt_vaga) : null;
  if (qtyVaga != null) capacityParts.push(`${qtyVaga} vagas`);
  const areaM2 = props.area_metro != null && Number(props.area_metro) > 0 ? Number(props.area_metro) : (props.qt_area_metro != null && Number(props.qt_area_metro) > 0 ? Number(props.qt_area_metro) : null);
  if (areaM2 != null) capacityParts.push(`${areaM2.toLocaleString("pt-BR")} m²`);
  const capacityInfo = capacityParts.length > 0 ? capacityParts.join(" · ") : null;

  const row = {
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
  if (phone != null) row.phone = phone.slice(0, 50);
  if (openingHoursRaw != null) row.opening_hours = { text: openingHoursRaw.slice(0, 500) };
  if (capacityInfo != null) row.capacity_info = capacityInfo.slice(0, 200);
  if (operationalStatus != null) row.operational_status = operationalStatus;
  if (servicesOffered != null) {
    let text = String(servicesOffered).replace(/, encaminhamentos par\s*$/i, "").trim();
    if (text && !/[.!?]$/.test(text)) text += ".";
    row.services_offered = text.slice(0, 2000);
  }
  return row;
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
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (text.trimStart().startsWith("<")) throw new Error(`WFS retornou XML em vez de JSON. Verifique typeName na URL. Resposta: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const BATCH = 200;

async function main() {
  loadEnv();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Defina no .env: SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.");
    console.error("A chave service_role está em: Supabase Dashboard > Project Settings > API > service_role (secret).");
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
