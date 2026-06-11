import type { SupabaseClient } from "@supabase/supabase-js";

type DirectionsStep = {
  travel_mode?: string;
  html_instructions?: string;
  transit_details?: {
    line?: { short_name?: string; name?: string; vehicle?: { name?: string } };
    departure_stop?: { name?: string };
    arrival_stop?: { name?: string };
    num_stops?: number;
  };
};

type DirectionsLeg = {
  steps?: DirectionsStep[];
  duration?: { value?: number; text?: string };
  distance?: { value?: number; text?: string };
};

type DirectionsRoute = { legs?: DirectionsLeg[] };
type DirectionsResponse = {
  status: string;
  routes?: DirectionsRoute[];
  error_message?: string;
};

export function getServiceTypeName(type: string): string {
  const names: Record<string, string> = {
    "ubs": "UBS",
    "school": "escolas",
    "ceu": "CEUs",
    "hospital": "hospitais",
    "library": "bibliotecas",
    "sports_center": "centros esportivos",
    "transit_station": "pontos de ônibus e transporte",
    "train_station": "estações de trem (CPTM)",
    "metro_station": "estações de metrô",
    "park": "parques",
    "street_market": "feiras",
    "community_center": "centros comunitários",
    "daycare": "creches",
    "market": "mercados",
    "city_market": "mercados municipais",
    "theater": "teatros e cinema",
    "museum": "museus",
    "social_assistance": "assistência social",
    "police_station": "delegacia e polícia",
    "cemetery": "cemitérios",
    "accessibility": "acessibilidade",
    "recycling_point": "reciclagem e limpeza",
    "fire_station": "bombeiros",
    "other": "serviços",
  };
  return names[type] || "serviços";
}

export function inferServiceTypeFromText(text: string): string | null {
  const t = text.toLowerCase().trim();
  // "usb" é transposição/typo recorrente de "ubs" (unidade básica de saúde).
  if (/\busb\b/.test(t)) return "ubs";
  if (/\bubs[\u0027\u2019']?s?\b|unidade\s+b[aá]sica\s+de\s+sa[uú]de|posto\s+de\s+sa[uú]de|sa[uú]de\s+p[uú]blica/.test(t)) return "ubs";
  if (/\bceu[s]?\b|centro\s+educacional/.test(t)) return "ceu";
  if (/\bhospital(is)?\b|\bhospitais\b/.test(t)) return "hospital";
  if (/\bescola[s]?\b|educa[cç][aã]o/.test(t)) return "school";
  if (/\bbiblioteca[s]?\b/.test(t)) return "library";
  if (/\bcentro\s+esportivo|esportivo[s]?\b|esporte[s]?\b|quadra[s]?|academia\s+p[uú]blica/.test(t)) return "sports_center";
  if (/\bparque[s]?\b|parques?\s+pr[oó]ximos?/.test(t)) return "park";
  if (/\bfeira[s]?\s+(livres?|de\s+rua)?|feira\s+livre/.test(t)) return "street_market";
  if (/\bcentro[s]?\s+comunit[aá]rio|comunit[aá]rio/.test(t)) return "community_center";
  if (/\bcreche[s]?\b|ber[cç][aá]rio/.test(t)) return "daycare";
  if (/\bmercado[s]?\s+municipal|mercados?\s+p[uú]blicos?/.test(t)) return "city_market";
  if (/\bmercado[s]?\b/.test(t)) return "market";
  if (/\bteatro[s]?\b|cinema[s]?\b/.test(t)) return "theater";
  if (/\bmuseu[s]?\b/.test(t)) return "museum";
  if (/\bassist[eê]n[cç]ia[s]?\s+social(is)?|\bassist[eê]n[cç]ia[s]?\s+sociais\b|cr[aá]s?\b|social/.test(t)) return "social_assistance";
  // Trem (CPTM) e metrô são camadas próprias do GeoSampa (estacao_trem / estacao_metro):
  // precisam ser distinguidos do ponto de ônibus, senão a busca devolve paradas de ônibus
  // em vez da estação pedida. Trem/CPTM antes de metrô; ambos antes do transporte genérico.
  if (/\btrem\b|\bcptm\b|esta[cç][aã]o\s+de\s+trem|trem\s+metropolitano/.test(t)) return "train_station";
  if (/\bmetr[oô](?![a-zçáàâãéêíóôõúü])|esta[cç][aã]o\s+de\s+metr[oô]/.test(t)) return "metro_station";
  if (/\btransporte[s]?\b|\besta[cç][aã]o\b|\bterminal\b|\b(o[nú]nibus|ônibus|onibus|ponto[s]?\s+de\s+[oô]nibus|parada[s]?\s+de\s+[oô]nibus|paradas?\s+pr[oó]ximas?|pontos?\s+pr[oó]ximos?|terminais?\s+de\s+[oô]nibus|transporte\s+p[uú]blico|esta[cç][aã]o\s+de\s+[oô]nibus)\b/.test(t)) return "transit_station";
  if (/\bdelegacia[s]?\b|pol[ií]cia|pm\b|guardas?\s+municipal/.test(t)) return "police_station";
  if (/\bcemit[eé]rio[s]?\b/.test(t)) return "cemetery";
  if (/\bacessibilidade|acess[ií]vel/.test(t)) return "accessibility";
  if (/\breciclagem|ecoponto|limpeza\s+p[uú]blica/.test(t)) return "recycling_point";
  if (/\bbombeiro[s]?\b|corpo\s+de\s+bombeiros/.test(t)) return "fire_station";
  return null;
}

function hasValidAddress(s: { address?: string | null }): boolean {
  const a = (s.address || "").trim().toLowerCase();
  if (!a) return false;
  if (a === "endereço não informado" || a === "endereco nao informado") return false;
  return true;
}

export function formatServicesWithContext(
  services: Record<string, unknown>[],
  serviceType: string,
  originalDistrict: string | null,
  isExpanded: boolean,
  referenceLocationText?: string | null,
): string {
  const withAddress = services.filter(hasValidAddress);
  if (withAddress.length === 0) {
    return "";
  }
  const typeName = getServiceTypeName(serviceType);
  const ref = (referenceLocationText || "").trim();
  const header = isExpanded
    ? ref
      ? `Aqui estão as opções mais próximas de ${typeName} perto de ${ref}:`
      : `Aqui estão as opções mais próximas de ${typeName}${originalDistrict && originalDistrict !== "null" ? ` em ${originalDistrict}` : " de você"}:`
    : ref
      ? `Encontrei ${withAddress.length} ${typeName} perto de ${ref}:`
      : `Encontrei ${withAddress.length} ${typeName}:`;

  // IMPORTANTE: usar só "\n" SIMPLES como separador (sem "\n\n" nem espaços de
  // indentação). O sanitizeMessageContent do app colapsa qualquer sequência de
  // 2+ espaços/quebras num único espaço; apenas o "\n" simples sobrevive, e a
  // diagramação do chat (withStructuredListLineBreaks) o converte em quebra dura
  // antes de cada item numerado / linha com emoji → um item por linha.
  const list = withAddress.map((s: Record<string, unknown>, i: number) => {
    const districtInfo = isExpanded ? ` (${s.district})` : "";
    const rating = s.average_rating ? ` ⭐ ${Number(s.average_rating).toFixed(1)}` : "";
    const dist = Number.isFinite(s._distance as number)
      ? ` — a ${formatDistanceMeters(s._distance as number)}`
      : "";
    return `${i + 1}. ${s.name}${districtInfo}\n📍 ${s.address}${dist}${rating}`;
  }).join("\n");

  const footer = isExpanded
    ? "\n💡 Quer que eu calcule a rota para alguma delas?\nPara mais informações, [clique aqui](/servicos-proximos)."
    : "";

  return `${header}\n${list}${footer}`;
}

export function buildGoogleMapsDirectionsUrl(originLat: number, originLon: number, destinationAddress: string): string {
  const dest = encodeURIComponent(destinationAddress.trim());
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${dest}&travelmode=transit`;
}

export function buildGoogleMapsDirectionsUrlFromAddresses(originAddress: string, destinationAddress: string): string {
  const origin = encodeURIComponent(originAddress.trim());
  const dest = encodeURIComponent(destinationAddress.trim());
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=transit`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();
}

export async function fetchGoogleDirectionsTransit(
  originAddress: string,
  destinationAddress: string,
  apiKey: string,
): Promise<
  | { ok: true; steps: string[]; durationText?: string; distanceText?: string }
  | { ok: false; error?: string }
> {
  if (!apiKey?.trim()) return { ok: false, error: "missing_api_key" };
  const origin = encodeURIComponent(originAddress.trim());
  const dest = encodeURIComponent(destinationAddress.trim());
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=transit&language=pt-BR&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as DirectionsResponse;
    if (data.status !== "OK" || !data.routes?.length) {
      return { ok: false, error: data.status === "ZERO_RESULTS" ? "zero_results" : data.error_message || data.status };
    }
    const leg = data.routes[0].legs?.[0];
    const durationText = leg?.duration?.text?.trim() || undefined;
    const distanceText = leg?.distance?.text?.trim() || undefined;
    if (!leg?.steps?.length) return { ok: true, steps: [], durationText, distanceText };

    const rawSteps: { mode: string; text: string }[] = [];
    for (const s of leg.steps) {
      const mode = (s.travel_mode || "").toUpperCase();
      const td = s.transit_details;
      if (mode === "TRANSIT" && td) {
        const lineName = td.line?.short_name || td.line?.name || td.line?.vehicle?.name || "ônibus/metrô";
        const from = td.departure_stop?.name || "parada de partida";
        const to = td.arrival_stop?.name || "parada de destino";
        const n = td.num_stops != null ? ` (${td.num_stops} parada${td.num_stops !== 1 ? "s" : ""})` : "";
        rawSteps.push({ mode: "TRANSIT", text: `• Pegue **${lineName}** na parada *${from}*, desça em *${to}*${n}` });
      } else {
        const text = stripHtml(s.html_instructions || "");
        if (text) rawSteps.push({ mode: "WALKING", text: `• ${text}` });
      }
    }

    const steps: string[] = [];
    for (let i = 0; i < rawSteps.length; i++) {
      const curr = rawSteps[i];
      const next = rawSteps[i + 1];
      if (curr.mode === "WALKING" && next?.mode === "TRANSIT") {
        const walk = curr.text.replace(/^•\s*/, "");
        const transit = next.text.replace(/^•\s*/, "");
        steps.push(`• ${walk} • ${transit}`);
        i++;
      } else {
        steps.push(curr.text);
      }
    }
    return { ok: true, steps, durationText, distanceText };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Espelha src/lib/nearbyRadiusBands.ts: cada preset de raio é uma FAIXA EM ANEL
// (Haversine), não um disco cumulativo. O módulo "Perto de você" usa essa regra e o
// chat deve devolver as mesmas faixas (500 m → 0-500; 1 km → 501-1000;
// 2 km → 1100-2000; 5 km → 2100-5000). Mantido em sincronia manual com o frontend.
const NEARBY_RADIUS_PRESETS = [500, 1000, 2000, 5000] as const;

function clampNearbyRadiusMeters(m: number): number {
  const first = NEARBY_RADIUS_PRESETS[0];
  const last = NEARBY_RADIUS_PRESETS[NEARBY_RADIUS_PRESETS.length - 1];
  if (m <= first) return first;
  if (m >= last) return last;
  return NEARBY_RADIUS_PRESETS.reduce(
    (prev, cur) => (Math.abs(cur - m) < Math.abs(prev - m) ? cur : prev),
    first as number,
  );
}

function getNearbyDistanceBand(presetMeters: number): { min: number; max: number } {
  switch (clampNearbyRadiusMeters(presetMeters)) {
    case 500:
      return { min: 0, max: 500 };
    case 1000:
      return { min: 501, max: 1000 };
    case 2000:
      return { min: 1100, max: 2000 };
    case 5000:
      return { min: 2100, max: 5000 };
    default:
      return { min: 0, max: presetMeters };
  }
}

// Texto curto da faixa em anel, usado nas mensagens de fallback (quando a faixa fica vazia).
function nearbyBandHint(presetMeters: number): string {
  switch (clampNearbyRadiusMeters(presetMeters)) {
    case 500:
      return "a até 500 m";
    case 1000:
      return "entre 501 m e 1 km";
    case 2000:
      return "entre 1,1 km e 2 km";
    case 5000:
      return "entre 2,1 km e 5 km";
    default:
      return "";
  }
}

function normalizeForDedup(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Núcleo do endereço para comparar "mesmo logradouro" tolerando lixo (acentos,
 * "Rua/Av.", nome do serviço grudado no campo, bairro no fim). Mantém só letras/dígitos.
 */
function addressCoreKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\b(rua|r|avenida|av|alameda|al|travessa|tv|praca|pca|estrada|estr|rodovia|rod|viaduto|largo)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Colapsa serviços do MESMO tipo que são o "mesmo lugar físico" (ex.: EMEF/EMEI/CEI de
 * um CEU, ou cópias com nome/coordenada/endereço variando) em UMA opção para exibição.
 * Só afeta a APRESENTAÇÃO no chat (não toca a base; a limpeza persistente é via `duplicate_of`).
 *
 * Dois registros são o "mesmo lugar" se estão a <= ~150 m um do outro OU têm o MESMO núcleo
 * de endereço. Combinar os dois sinais cobre os duplicados mesmo com coordenadas espalhadas
 * pelo complexo (o ~11 m de antes não pegava) ou endereço sujo. Processa em ordem de distância
 * (greedy) e mantém, por grupo: menor distância, nome mais descritivo (mais longo) e melhor nota.
 */
function collapseColocated<T extends Record<string, unknown> & { _distance: number }>(
  rows: T[],
  proximityMeters = 150,
): T[] {
  type Cluster = { rep: T; lat: number; lon: number; addrKey: string };
  const clusters: Cluster[] = [];
  for (const s of rows) {
    const lat = Number(s.latitude);
    const lon = Number(s.longitude);
    const addrKey = hasValidAddress(s) ? addressCoreKey(s.address) : "";
    let target: Cluster | undefined;
    for (const c of clusters) {
      const sameAddr = addrKey.length > 0 && addrKey === c.addrKey;
      const closeCoord = Number.isFinite(lat) && Number.isFinite(lon) &&
        Number.isFinite(c.lat) && Number.isFinite(c.lon) &&
        distanceMeters(lat, lon, c.lat, c.lon) <= proximityMeters;
      if (sameAddr || closeCoord) {
        target = c;
        break;
      }
    }
    if (!target) {
      clusters.push({ rep: { ...s }, lat, lon, addrKey });
      continue;
    }
    const rep = target.rep;
    rep._distance = Math.min(rep._distance, s._distance);
    if (String(s.name ?? "").trim().length > String(rep.name ?? "").trim().length) rep.name = s.name;
    if ((Number(s.average_rating) || 0) > (Number(rep.average_rating) || 0)) rep.average_rating = s.average_rating;
    if (!hasValidAddress(rep) && hasValidAddress(s)) rep.address = s.address;
  }
  return clusters.map((c) => c.rep).sort((a, b) => a._distance - b._distance);
}

// Tipos lógicos (trem/metrô) → camada GeoSampa correspondente em public_services.
// As linhas dessas camadas têm service_type="transit_station" mas address="Endereço
// não informado": são localizadas por nome + coordenadas, não por endereço de rua.
const STATION_SOURCE_LAYER: Record<string, string> = {
  train_station: "estacao_trem",
  metro_station: "estacao_metro",
};

function titleCaseStationName(name: string): string {
  const lower = name.toLowerCase().trim();
  const small = new Set(["de", "da", "do", "das", "dos", "e"]);
  return lower
    .split(/(\s+|-|\/)/)
    .map((part) => {
      if (/^(\s+|-|\/)$/.test(part)) return part;
      if (small.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

function formatStationsWithContext(
  stations: Record<string, unknown>[],
  serviceType: string,
  referenceLocationText: string | null | undefined,
  hasDistances: boolean,
  headerOverride?: string,
): string {
  const typeName = getServiceTypeName(serviceType);
  const ref = (referenceLocationText || "").trim();
  const header = headerOverride ??
    (hasDistances
      ? ref
        ? `Aqui estão as ${typeName} mais próximas de ${ref}:`
        : `Aqui estão as ${typeName} mais próximas de você:`
      : `Aqui estão ${typeName} em São Paulo:`);
  // "\n" SIMPLES (ver nota em formatServicesWithContext): só ele sobrevive ao
  // sanitize do app; a diagramação do chat o converte em quebra dura por item.
  const list = stations
    .map((s, i) => {
      const d = hasDistances && Number.isFinite(s._distance as number)
        ? ` — a ${formatDistanceMeters(s._distance as number)}`
        : "";
      return `${i + 1}. Estação ${titleCaseStationName(String(s.name))}${d}`;
    })
    .join("\n");
  const footer = "\n💡 Quer que eu calcule a rota até alguma delas?\nPara mais informações, [clique aqui](/servicos-proximos).";
  return `${header}\n${list}${footer}`;
}

// Busca dedicada para estações de trem/metrô. A camada inteira é pequena (~100 linhas),
// então buscamos todas e ordenamos por distância em memória — mais preciso que bbox e
// sem o filtro de endereço (estações têm "Endereço não informado", só nome + coordenadas).
async function findNearbyStations(
  supabase: SupabaseClient,
  serviceType: string,
  sourceLayer: string,
  limit: number,
  userLat?: number | null,
  userLon?: number | null,
  referenceLocationText?: string | null,
  radiusMeters: number = 2000,
): Promise<string> {
  const typeName = getServiceTypeName(serviceType);
  const hasCoords = userLat != null && userLon != null && !Number.isNaN(userLat) && !Number.isNaN(userLon);

  const { data, error } = await supabase
    .from("public_services")
    .select("name, district, latitude, longitude")
    .eq("service_type", "transit_station")
    .eq("source_layer", sourceLayer)
    .is("duplicate_of", null)
    .limit(500);

  if (error || !data?.length) {
    return `No momento não tenho ${typeName} cadastradas na minha base. Você pode consultar a rede em cptm.sp.gov.br ou metro.sp.gov.br.`;
  }

  const seen = new Set<string>();
  let rows = (data as unknown as Record<string, unknown>[]).filter((s) => {
    const name = String(s.name ?? "").trim();
    if (!name) return false;
    const key = normalizeForDedup(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (rows.length === 0) {
    return `No momento não tenho ${typeName} cadastradas na minha base. Você pode consultar a rede em cptm.sp.gov.br ou metro.sp.gov.br.`;
  }

  if (hasCoords) {
    const byDistance = rows
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({ ...s, _distance: distanceMeters(userLat!, userLon!, Number(s.latitude), Number(s.longitude)) }))
      .sort((a, b) => (a._distance as number) - (b._distance as number));
    if (byDistance.length === 0) {
      return `No momento não tenho ${typeName} com localização cadastrada na minha base.`;
    }

    // Aplica a FAIXA EM ANEL do preset escolhido (igual à busca de serviços e ao módulo
    // "Perto de você"): ex. 2 km → 1,1-2 km. Estações são infra esparsa: é comum não
    // haver nenhuma na faixa. Nesse caso, em vez de devolver vazio, mostramos as mais
    // próximas com um aviso explícito — espelhando o fallback da busca de serviços comuns.
    const band = getNearbyDistanceBand(radiusMeters);
    const withinRadius = byDistance.filter((s) => {
      const d = s._distance as number;
      return d >= band.min && d <= band.max;
    });
    if (withinRadius.length > 0) {
      return formatStationsWithContext(withinRadius.slice(0, Math.max(1, limit)), serviceType, referenceLocationText, true);
    }

    const ref = (referenceLocationText || "").trim();
    const where = ref ? ` de ${ref}` : " de você";
    const nearest = byDistance.slice(0, Math.max(1, limit));
    const headerOverride = `Não há ${typeName} ${nearbyBandHint(radiusMeters)}${where}. Aqui estão as mais próximas:`;
    return formatStationsWithContext(nearest, serviceType, referenceLocationText, true, headerOverride);
  }

  rows = rows.slice(0, Math.max(1, limit));
  return formatStationsWithContext(rows, serviceType, referenceLocationText, false);
}

export async function findNearbyServices(
  supabase: SupabaseClient,
  serviceType: string,
  district?: string,
  limit: number = 5,
  userLat?: number | null,
  userLon?: number | null,
  radiusMeters: number = 2000,
  minRating: number = 0,
  searchQuery?: string | null,
  referenceLocationText?: string | null,
): Promise<string> {
  // Trem/metrô têm camada própria (estacao_trem/estacao_metro) e endereço não informado:
  // desviam para a busca dedicada por nome + coordenadas, evitando devolver pontos de ônibus.
  const stationSourceLayer = STATION_SOURCE_LAYER[serviceType];
  if (stationSourceLayer) {
    return await findNearbyStations(
      supabase,
      serviceType,
      stationSourceLayer,
      limit,
      userLat,
      userLon,
      referenceLocationText,
      radiusMeters,
    );
  }

  const typeName = getServiceTypeName(serviceType);
  const limitWithBuffer = Math.max(limit * 3, 15);
  const hasCoords = userLat != null && userLon != null && !Number.isNaN(userLat) && !Number.isNaN(userLon);
  const selectFields = hasCoords
    ? "name, address, district, phone, average_rating, service_type, latitude, longitude"
    : "name, address, district, phone, average_rating, service_type";
  const search = (searchQuery || "").trim().toLowerCase();

  const sortAndFormat = (data: Record<string, unknown>[], isExpanded: boolean, radiusOverride?: number, bandMin: number = 0): string => {
    const radius = radiusOverride ?? radiusMeters;
    let withAddress = data.filter(hasValidAddress);
    if (withAddress.length === 0) return "";

    const seen = new Set<string>();
    withAddress = withAddress.filter((s: Record<string, unknown>) => {
      const key = [
        normalizeForDedup(s.name),
        normalizeForDedup(s.address),
        normalizeForDedup(s.district),
      ].join("|");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (withAddress.length === 0) return "";

    if (search) {
      withAddress = withAddress.filter((s: Record<string, unknown>) => {
        const name = (s.name || "").toString().toLowerCase();
        const address = (s.address || "").toString().toLowerCase();
        const districtStr = (s.district || "").toString().toLowerCase();
        return name.includes(search) || address.includes(search) || districtStr.includes(search);
      });
      if (withAddress.length === 0) return "";
    }

    let ordered = withAddress;
    if (hasCoords && withAddress.some((s: Record<string, unknown>) => s.latitude != null && s.longitude != null)) {
      const withDistance = [...withAddress]
        .map((s: Record<string, unknown>) => ({
          ...s,
          _distance: (s.latitude != null && s.longitude != null)
            ? distanceMeters(userLat!, userLon!, Number(s.latitude), Number(s.longitude))
            : Infinity,
        }))
        .filter((s: Record<string, unknown>) => {
          const d = s._distance as number;
          if (d === Infinity) return true;
          return Number.isFinite(d) && d >= bandMin && d <= radius;
        })
        .filter((s: Record<string, unknown>) => minRating === 0 || (Number(s.average_rating) || 0) >= minRating)
        .sort((a, b) => (a._distance as number) - (b._distance as number));
      // Colapsa unidades do mesmo tipo no mesmo lugar (proximidade ~150 m OU mesmo
      // endereço) — ex.: EMEF/EMEI/CEI de um CEU, cópias com nome/coordenada/endereço
      // variando — ANTES de cortar em `limit`.
      // Mantém _distance para exibir a distância de cada equipamento no resultado.
      ordered = collapseColocated(withDistance)
        .slice(0, limit) as Record<string, unknown>[];
    } else {
      ordered = withAddress
        .filter((s: Record<string, unknown>) => minRating === 0 || (Number(s.average_rating) || 0) >= minRating)
        .slice(0, limit);
    }
    if (ordered.length === 0) return "";
    return formatServicesWithContext(ordered, serviceType, district ?? null, isExpanded, referenceLocationText) || "";
  };

  const tryFormat = (data: Record<string, unknown>[], isExpanded: boolean): string => sortAndFormat(data, isExpanded);

  if (hasCoords) {
    const metersToDegrees = (meters: number) => meters / 111320;
    const getBboxForRadiusMeters = (lat: number, lon: number, meters: number) => {
      const latDelta = metersToDegrees(meters);
      const cosLat = Math.cos((lat * Math.PI) / 180);
      const lngDeltaRaw = metersToDegrees(meters) / (Math.abs(cosLat) < 1e-6 ? 1e-6 : Math.abs(cosLat));
      const lngDelta = Number.isFinite(lngDeltaRaw) ? lngDeltaRaw : 0;
      return {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLng: lon - lngDelta,
        maxLng: lon + lngDelta,
      };
    };

    const fetchByBbox = async (bboxRadiusMeters: number, rowCap: number) => {
      const box = getBboxForRadiusMeters(userLat!, userLon!, Math.max(100, bboxRadiusMeters));
      const { data, error } = await supabase
        .from("public_services")
        .select(selectFields)
        .eq("service_type", serviceType)
        .is("duplicate_of", null)
        .gte("latitude", box.minLat)
        .lte("latitude", box.maxLat)
        .gte("longitude", box.minLng)
        .lte("longitude", box.maxLng)
        .limit(rowCap);
      return { data, error };
    };

    // Faixa em anel do preset (espelha "Perto de você"): a busca principal devolve só
    // o que está ENTRE band.min e band.max — não o disco 0..raio. Ex.: 2 km → 1,1-2 km.
    const band = getNearbyDistanceBand(radiusMeters);
    const { data: inRadius, error: inRadiusErr } = await fetchByBbox(band.max, 1200);
    if (!inRadiusErr && inRadius?.length) {
      const out = sortAndFormat(inRadius as unknown as Record<string, unknown>[], !district, band.max, band.min);
      if (out) {
        console.log(`[findNearbyServices] Sorted by distance from user (bbox ring ${band.min}-${band.max}m)`);
        return out;
      }
    }

    // Fallback quando não há nada no raio pedido: expande até 5 km (não encolhe se o raio
    // pedido já for maior). Antes era 20 km — distante demais para "perto de você".
    const fallbackRadius = Math.max(radiusMeters, 5000);
    const fallbackLabel = fallbackRadius < 1000 ? `${fallbackRadius} m` : `${fallbackRadius / 1000} km`;
    const { data: inFallback, error: inFallbackErr } = await fetchByBbox(fallbackRadius, 2000);
    if (!inFallbackErr && inFallback?.length) {
      const rowsFb = inFallback as unknown as Record<string, unknown>[];
      const outFb = sortAndFormat(rowsFb, !district, fallbackRadius);
      if (outFb) {
        console.log(`[findNearbyServices] No results in ring band, showing within ${fallbackLabel} (bbox)`);
        return `Nenhum ${typeName} ${nearbyBandHint(radiusMeters)} de você. Aqui estão as opções mais próximas (até ${fallbackLabel}):\n\n${outFb}`;
      }
      const outAny = sortAndFormat(rowsFb, !district, 1e9);
      if (outAny) {
        console.log("[findNearbyServices] Showing first N without distance filter (bbox fallback)");
        return `Aqui estão algumas opções de ${typeName} em São Paulo:\n\n${outAny}`;
      }
    }

    const { data: cityWide, error: cityWideErr } = await supabase
      .from("public_services")
      .select(selectFields)
      .eq("service_type", serviceType)
      .is("duplicate_of", null)
      .limit(2000);
    if (!cityWideErr && cityWide?.length) {
      const out = sortAndFormat(cityWide as unknown as Record<string, unknown>[], !district, 1e9);
      if (out) {
        console.log("[findNearbyServices] Showing first N from city-wide fallback");
        return `Aqui estão algumas opções de ${typeName} em São Paulo:\n\n${out}`;
      }
    }
  }

  if (district) {
    const { data, error } = await supabase
      .from("public_services")
      .select(selectFields)
      .eq("service_type", serviceType)
      .is("duplicate_of", null)
      .ilike("district", `%${district}%`)
      .limit(limitWithBuffer);

    if (!error && data?.length) {
      const out = tryFormat(data as unknown as Record<string, unknown>[], false);
      if (out) return out;
    }

    const { data: cityWide, error: cityError } = await supabase
      .from("public_services")
      .select(selectFields)
      .eq("service_type", serviceType)
      .is("duplicate_of", null)
      .limit(limitWithBuffer);

    if (!cityError && cityWide?.length) {
      const out = tryFormat(cityWide as unknown as Record<string, unknown>[], true);
      if (out) return out;
    }
  } else {
    const { data, error } = await supabase
      .from("public_services")
      .select(selectFields)
      .eq("service_type", serviceType)
      .is("duplicate_of", null)
      .limit(limitWithBuffer);

    if (!error && data?.length) {
      const out = tryFormat(data as unknown as Record<string, unknown>[], false);
      if (out) return out;
    }
  }

  const { data: otherTypes } = await supabase
    .from("public_services")
    .select("service_type")
    .limit(20);

  const availableTypes = [...new Set((otherTypes || []).map((s: Record<string, unknown>) => s.service_type))] as string[];
  const typeNames = availableTypes.map((t: string) => getServiceTypeName(t)).slice(0, 4);

  if (typeNames.length > 0) {
    return `No momento não tenho ${typeName} com endereço cadastrado na sua região. Posso te ajudar a encontrar:\n\n${typeNames.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nQual desses te interessa?`;
  }

  return `Estou atualizando minha base de ${typeName}. Tente novamente em instantes.`;
}

export async function getServiceAddressByName(supabase: SupabaseClient, serviceName: string): Promise<string | null> {
  const nameTrim = serviceName.trim();
  if (nameTrim.length < 3) return null;

  // Usa o índice full-text (idx_public_services_search_tsv) em vez de
  // ILIKE '%...%', que fazia full table scan na public_services (~77k linhas do
  // ETL GeoSampa) e estourava o statement_timeout. Ver bug
  // 2026-06-01-public-services-getserviceaddress-timeout.
  const { data, error } = await supabase
    .from("public_services")
    .select("name, address, district, phone")
    .textSearch("search_tsv", nameTrim, { type: "plain", config: "portuguese" })
    .limit(5);

  if (error) {
    console.warn("[getServiceAddressByName] DB error:", error.message);
    return null;
  }
  if (!data?.length) return null;

  // FTS não garante ordem por relevância; prefere nome igual, depois que contém o termo.
  const norm = (s: string | null | undefined) =>
    (s || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const q = norm(nameTrim);
  const best = data.find((r) => norm(r.name) === q) ||
    data.find((r) => norm(r.name).includes(q)) ||
    data[0];

  const addressLine = [best.address, best.district].filter(Boolean).join(", ");
  const phoneNote = best.phone ? `\n📞 ${best.phone}` : "";
  return `${best.name}\n📍 ${addressLine}${phoneNote}`;
}
