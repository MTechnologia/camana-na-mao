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
  if (/\btransporte[s]?\b|\b(o[nú]nibus|ônibus|onibus|ponto[s]?\s+de\s+[oô]nibus|parada[s]?\s+de\s+[oô]nibus|paradas?\s+pr[oó]ximas?|pontos?\s+pr[oó]ximos?|terminais?\s+de\s+[oô]nibus|transporte\s+p[uú]blico|esta[cç][aã]o\s+de\s+[oô]nibus)\b/.test(t)) return "transit_station";
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

  const list = withAddress.map((s: Record<string, unknown>, i: number) => {
    const districtInfo = isExpanded ? ` (${s.district})` : "";
    const rating = s.average_rating ? ` ⭐ ${Number(s.average_rating).toFixed(1)}` : "";
    return `${i + 1}. ${s.name}${districtInfo}\n   📍 ${s.address}${rating}`;
  }).join("\n\n");

  const footer = isExpanded
    ? "\n\n💡 Quer que eu calcule a rota para alguma delas?\n\nPara mais informações, [clique aqui](/servicos-proximos)."
    : "";

  return `${header}\n\n${list}${footer}`;
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

function normalizeForDedup(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
  const typeName = getServiceTypeName(serviceType);
  const limitWithBuffer = Math.max(limit * 3, 15);
  const hasCoords = userLat != null && userLon != null && !Number.isNaN(userLat) && !Number.isNaN(userLon);
  const selectFields = hasCoords
    ? "name, address, district, phone, average_rating, service_type, latitude, longitude"
    : "name, address, district, phone, average_rating, service_type";
  const search = (searchQuery || "").trim().toLowerCase();

  const sortAndFormat = (data: Record<string, unknown>[], isExpanded: boolean, radiusOverride?: number): string => {
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
      ordered = [...withAddress]
        .map((s: Record<string, unknown>) => ({
          ...s,
          _distance: (s.latitude != null && s.longitude != null)
            ? distanceMeters(userLat!, userLon!, Number(s.latitude), Number(s.longitude))
            : Infinity,
        }))
        .filter((s: Record<string, unknown>) => {
          const d = s._distance as number;
          return (Number.isFinite(d) && d <= radius) || d === Infinity;
        })
        .filter((s: Record<string, unknown>) => minRating === 0 || (Number(s.average_rating) || 0) >= minRating)
        .sort((a, b) => (a._distance as number) - (b._distance as number))
        .slice(0, limit)
        .map(({ _distance, ...rest }) => rest) as Record<string, unknown>[];
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
        .gte("latitude", box.minLat)
        .lte("latitude", box.maxLat)
        .gte("longitude", box.minLng)
        .lte("longitude", box.maxLng)
        .limit(rowCap);
      return { data, error };
    };

    const { data: inRadius, error: inRadiusErr } = await fetchByBbox(radiusMeters, 1200);
    if (!inRadiusErr && inRadius?.length) {
      const out = sortAndFormat(inRadius as unknown as Record<string, unknown>[], !district);
      if (out) {
        console.log("[findNearbyServices] Sorted by distance from user (bbox current radius)");
        return out;
      }
    }

    const { data: in20km, error: in20kmErr } = await fetchByBbox(20000, 2000);
    if (!in20kmErr && in20km?.length) {
      const rows20 = in20km as unknown as Record<string, unknown>[];
      const out20 = sortAndFormat(rows20, !district, 20000);
      if (out20) {
        console.log("[findNearbyServices] No results in radius, showing within 20km (bbox)");
        return `Nenhum ${typeName} a até ${radiusMeters < 1000 ? radiusMeters + " m" : (radiusMeters / 1000) + " km"} de você. Aqui estão as opções mais próximas (até 20 km):\n\n${out20}`;
      }
      const outAny = sortAndFormat(rows20, !district, 1e9);
      if (outAny) {
        console.log("[findNearbyServices] Showing first N without distance filter (bbox 20km)");
        return `Aqui estão algumas opções de ${typeName} em São Paulo:\n\n${outAny}`;
      }
    }

    const { data: cityWide, error: cityWideErr } = await supabase
      .from("public_services")
      .select(selectFields)
      .eq("service_type", serviceType)
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

  return `Estou atualizando minha base de serviços. Por enquanto, você pode buscar ${typeName} em sp156.prefeitura.sp.gov.br`;
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
