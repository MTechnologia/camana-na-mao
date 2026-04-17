import { type SupabaseClient } from "@supabase/supabase-js";

type ToolResult = { success: boolean; message: string; data?: unknown };

type NearbyDeps = {
  geocodeAddressWithGoogle: (
    supabase: SupabaseClient,
    addressParts: {
      street?: string | null;
      street_number?: string | null;
      neighborhood?: string | null;
      cep?: string | null;
      city?: string | null;
    },
  ) => Promise<{ lat: number; lon: number } | null>;
  geocodeAddressToCoord: (addressParts: {
    street?: string | null;
    street_number?: string | null;
    neighborhood?: string | null;
    cep?: string | null;
    city?: string | null;
  }) => Promise<{ lat: number; lon: number } | null>;
  reverseGeocodeLatLon: (lat: number, lon: number) => Promise<string | null>;
  findNearbyServices: (
    supabase: SupabaseClient,
    serviceType: string,
    district: string | undefined,
    limit: number,
    userLat: number | null,
    userLon: number | null,
    radiusMeters: number,
    minRating: number,
    searchQuery: string | null,
    referenceLocationText?: string | null,
  ) => Promise<string>;
};

type OlhoVivoDeps = {
  olhoVivoSearchLines: (
    termosBusca: string,
  ) => Promise<{ success: boolean; lines?: Array<{ cl: number; lt: string; tp: string; ts: string; sl: number }>; error?: string }>;
  olhoVivoSearchStops: (
    termosBusca: string,
  ) => Promise<{ success: boolean; stops?: Array<{ cp: number; np: string; ed: string; py: number; px: number }>; error?: string }>;
  olhoVivoGetStopsByLine: (
    codigoLinha: number,
  ) => Promise<{ success: boolean; stops?: Array<{ cp: number; np: string; ed: string; py: number; px: number }>; error?: string }>;
  olhoVivoPrevisao: (
    codigoParada: number,
    codigoLinha: number,
  ) => Promise<{
    success: boolean;
    parada?: {
      np?: string;
      l?: Array<{ c: string; lt0: string; lt1: string; vs?: Array<{ t?: string }> }>;
    };
    error?: string;
  }>;
  olhoVivoPrevisaoParada: (
    codigoParada: number,
  ) => Promise<{
    success: boolean;
    parada?: {
      np?: string;
      l?: Array<{ c: string; lt0: string; lt1: string; vs?: Array<{ t?: string }> }>;
    };
    error?: string;
  }>;
};

export async function handleFindNearbyServices(
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  accumulatedFields: Record<string, unknown> | undefined,
  deps: NearbyDeps,
): Promise<ToolResult> {
  let userLat: number | null = null;
  let userLon: number | null = null;

  if (args.user_lat != null && args.user_lon != null) {
    userLat = Number(args.user_lat);
    userLon = Number(args.user_lon);
  }
  if ((userLat == null || userLon == null) && accumulatedFields?.user_lat != null && accumulatedFields?.user_lon != null) {
    userLat = Number(accumulatedFields.user_lat);
    userLon = Number(accumulatedFields.user_lon);
  }
  if (userLat == null || userLon == null) {
    const { data: addr } = await supabase
      .from("user_addresses")
      .select("latitude, longitude, street, number, neighborhood, zip_code, city")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (addr?.latitude != null && addr?.longitude != null) {
      userLat = Number(addr.latitude);
      userLon = Number(addr.longitude);
    } else if (addr?.street && addr?.neighborhood) {
      let coords = await deps.geocodeAddressWithGoogle(supabase, {
        street: addr.street,
        street_number: addr.number,
        neighborhood: addr.neighborhood,
        cep: addr.zip_code,
        city: addr.city || "São Paulo",
      });
      if (!coords) {
        coords = await deps.geocodeAddressToCoord({
          street: addr.street,
          street_number: addr.number,
          neighborhood: addr.neighborhood,
          cep: addr.zip_code,
          city: addr.city || "São Paulo",
        });
      }
      if (coords) {
        userLat = coords.lat;
        userLon = coords.lon;
      }
    }
  }

  let referenceLocationText: string | null = null;
  if (userLat != null && userLon != null && Number.isFinite(userLat) && Number.isFinite(userLon)) {
    const method = typeof accumulatedFields?.location_method === "string" ? accumulatedFields.location_method : "";
    const street = typeof accumulatedFields?.street === "string" ? accumulatedFields.street.trim() : "";
    const neighborhood = typeof accumulatedFields?.neighborhood === "string" ? accumulatedFields.neighborhood.trim() : "";
    const streetNumber = typeof accumulatedFields?.street_number === "string" ? accumulatedFields.street_number.trim() : "";

    if (street && neighborhood) {
      referenceLocationText = streetNumber ? `${street}, ${streetNumber} - ${neighborhood}` : `${street} - ${neighborhood}`;
    } else if (method === "registered_address" && userId) {
      const { data: addrRow } = await supabase
        .from("user_addresses")
        .select("street, number, neighborhood")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle();
      const s = addrRow?.street?.trim();
      const n = addrRow?.neighborhood?.trim();
      const num = addrRow?.number?.trim();
      if (s && n) {
        referenceLocationText = num ? `${s}, ${num} - ${n}` : `${s} - ${n}`;
      }
    }
    if (!referenceLocationText) {
      referenceLocationText = await deps.reverseGeocodeLatLon(userLat, userLon);
    }
  }

  const radiusMeters = typeof args.radius_meters === "number" ? args.radius_meters : 2000;
  const minRating = typeof args.min_rating === "number" ? args.min_rating : 0;
  const searchQuery = typeof args.search_query === "string" ? args.search_query : null;
  const serviceTypeArg = String(args.service_type ?? "");
  const districtArg =
    args.district != null && String(args.district).trim() !== "" ? String(args.district).trim() : undefined;
  const rawLimit = args.limit;
  const limitParsed =
    typeof rawLimit === "number" && Number.isFinite(rawLimit)
      ? Math.floor(rawLimit)
      : parseInt(String(rawLimit ?? "10"), 10);
  const limitArg = Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : 10;

  const result = await deps.findNearbyServices(
    supabase,
    serviceTypeArg,
    districtArg,
    limitArg,
    userLat,
    userLon,
    radiusMeters,
    minRating,
    searchQuery,
    referenceLocationText,
  );
  return { success: true, message: result };
}

export async function handleSearchBusLines(
  args: Record<string, unknown>,
  deps: OlhoVivoDeps,
): Promise<ToolResult> {
  const termos = typeof args.termos_busca === "string" ? args.termos_busca.trim() : "";
  if (!termos) {
    return { success: false, message: "Informe o número ou nome da linha para buscar (ex: 8000 ou Lapa)." };
  }
  const out = await deps.olhoVivoSearchLines(termos);
  if (!out.success) {
    return { success: false, message: out.error || "Não foi possível consultar as linhas. Tente mais tarde." };
  }
  if (!out.lines?.length) {
    return { success: true, message: `Nenhuma linha encontrada para "${termos}". Tente outro número ou nome.` };
  }
  const linesText = out.lines.slice(0, 15).map((line) => {
    const sentido = line.sl === 1 ? `${line.tp} → ${line.ts}` : `${line.ts} → ${line.tp}`;
    return `• **${line.lt}** (cód. ${line.cl}): ${sentido}`;
  }).join("\n");
  return { success: true, message: `**Linhas encontradas:**\n${linesText}\n\n_Use o código (cód.) para consultar itinerário ou previsão._` };
}

export async function handleSearchBusStops(
  args: Record<string, unknown>,
  deps: OlhoVivoDeps,
): Promise<ToolResult> {
  const termos = typeof args.termos_busca === "string" ? args.termos_busca.trim() : "";
  if (!termos) {
    return { success: false, message: "Informe o nome da parada ou endereço (rua, logradouro). A API não busca por coordenadas; peça um endereço ou nome de rua ao cidadão." };
  }
  let out = await deps.olhoVivoSearchStops(termos);
  if (!out.success) {
    return { success: false, message: out.error || "Não foi possível consultar as paradas." };
  }
  if (!out.stops?.length && termos.includes(" ")) {
    const fallback = termos.split(/\s+/).filter((word) => word.length > 2).pop() || termos;
    if (fallback !== termos) {
      out = await deps.olhoVivoSearchStops(fallback);
    }
  }
  if (!out.stops?.length) {
    return { success: true, message: `Nenhuma parada encontrada para "${termos}". Peça ao cidadão o nome da rua ou do ponto (ex.: Afonso Braz, Balthazar da Veiga). A API da SPTrans não permite busca por coordenadas.` };
  }
  const stopsText = out.stops.slice(0, 12).map((stop) => `• **${stop.np}** (cód. ${stop.cp}) – ${stop.ed}`).join("\n");
  return { success: true, message: `**Paradas encontradas:**\n${stopsText}\n\n_Use o código (cód.) para consultar previsão de chegada._` };
}

export async function handleGetBusLineItinerary(
  args: Record<string, unknown>,
  deps: OlhoVivoDeps,
): Promise<ToolResult> {
  const codigoLinha = typeof args.codigo_linha === "number" ? args.codigo_linha : parseInt(String(args.codigo_linha), 10);
  if (!Number.isFinite(codigoLinha)) {
    return { success: false, message: 'Informe o código da linha (obtido em "buscar linhas").' };
  }
  const out = await deps.olhoVivoGetStopsByLine(codigoLinha);
  if (!out.success) {
    return { success: false, message: out.error || "Não foi possível buscar o itinerário." };
  }
  if (!out.stops?.length) {
    return { success: true, message: "Itinerário não disponível para esta linha." };
  }
  const itineraryText = out.stops.map((stop, index) => `${index + 1}. ${stop.np} – ${stop.ed}`).join("\n");
  return { success: true, message: `**Itinerário da linha (paradas em ordem):**\n${itineraryText}` };
}

export async function handleGetBusArrivalForecast(
  args: Record<string, unknown>,
  deps: OlhoVivoDeps,
): Promise<ToolResult> {
  const codigoParada = typeof args.codigo_parada === "number" ? args.codigo_parada : parseInt(String(args.codigo_parada), 10);
  const codigoLinha = typeof args.codigo_linha === "number" ? args.codigo_linha : parseInt(String(args.codigo_linha), 10);
  if (!Number.isFinite(codigoParada) || !Number.isFinite(codigoLinha)) {
    return { success: false, message: "Informe o código da parada e o código da linha." };
  }
  const out = await deps.olhoVivoPrevisao(codigoParada, codigoLinha);
  if (!out.success) {
    return { success: false, message: out.error || "Não foi possível obter a previsão." };
  }
  const parada = out.parada;
  if (!parada?.l?.length) {
    return { success: true, message: `Parada **${parada?.np || "?"}**: nenhuma previsão no momento para esta linha.` };
  }
  const parts: string[] = [`**Previsão – ${parada.np}**`];
  for (const linha of parada.l) {
    const veiculos = linha.vs || [];
    if (veiculos.length === 0) {
      parts.push(`\n• Linha **${linha.c}** (${linha.lt0} → ${linha.lt1}): sem previsão no momento.`);
    } else {
      const times = veiculos.slice(0, 5).map((vehicle) => vehicle.t || "--").join(", ");
      parts.push(`\n• Linha **${linha.c}** (${linha.lt0} → ${linha.lt1}): ${times}`);
    }
  }
  return { success: true, message: parts.join("\n") };
}

export async function handleGetBusStopForecastAllLines(
  args: Record<string, unknown>,
  deps: OlhoVivoDeps,
): Promise<ToolResult> {
  const codigoParada = typeof args.codigo_parada === "number" ? args.codigo_parada : parseInt(String(args.codigo_parada), 10);
  if (!Number.isFinite(codigoParada)) {
    return { success: false, message: 'Informe o código da parada (obtido em "buscar paradas").' };
  }
  const out = await deps.olhoVivoPrevisaoParada(codigoParada);
  if (!out.success) {
    return { success: false, message: out.error || "Não foi possível obter a previsão." };
  }
  const parada = out.parada;
  if (!parada?.l?.length) {
    return { success: true, message: `Parada **${parada?.np || "?"}**: nenhuma previsão no momento.` };
  }
  const parts: string[] = [`**Previsão – ${parada.np}** (todas as linhas)`];
  for (const linha of parada.l.slice(0, 15)) {
    const veiculos = linha.vs || [];
    if (veiculos.length === 0) {
      parts.push(`\n• Linha **${linha.c}** (${linha.lt0} → ${linha.lt1}): sem previsão.`);
    } else {
      const times = veiculos.slice(0, 3).map((vehicle) => vehicle.t || "--").join(", ");
      parts.push(`\n• Linha **${linha.c}** (${linha.lt0} → ${linha.lt1}): ${times}`);
    }
  }
  if (parada.l.length > 15) {
    parts.push(`\n_… e mais ${parada.l.length - 15} linhas._`);
  }
  return { success: true, message: parts.join("\n") };
}
