import type { SupabaseClient } from "@supabase/supabase-js";

export async function lookupCEP(cep: string): Promise<{
  valid: boolean;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}> {
  const cleanCEP = cep.replace(/\D/g, "");
  if (cleanCEP.length !== 8) {
    return { valid: false };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = (await response.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };

    if (data.erro) {
      return { valid: false };
    }

    return {
      valid: true,
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch (error) {
    console.error("[lookupCEP] Error:", error);
    return { valid: false };
  }
}

export async function geocodeAddressToCoord(addressParts: {
  street?: string | null;
  street_number?: string | null;
  neighborhood?: string | null;
  cep?: string | null;
  city?: string | null;
}): Promise<{ lat: number; lon: number } | null> {
  const city = addressParts.city || "São Paulo";
  const runQuery = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    if (!query || query.length < 5) return null;
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "br",
    })}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CamaraNaMao-SP/1.0 (participacao@camara.sp.gov.br)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  };

  const parts: string[] = [];
  if (addressParts.street) {
    parts.push(addressParts.street_number ? `${addressParts.street}, ${addressParts.street_number}` : addressParts.street);
  }
  if (addressParts.neighborhood) parts.push(addressParts.neighborhood);
  if (addressParts.cep) parts.push(addressParts.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"));
  parts.push(city, "Brazil");
  const fullQuery = parts.filter(Boolean).join(", ");
  try {
    let result = await runQuery(fullQuery);
    if (result) return result;
    if (addressParts.street_number && addressParts.street) {
      const fallbackParts = [addressParts.street, addressParts.neighborhood, city, "Brazil"].filter(Boolean);
      result = await runQuery(fallbackParts.join(", "));
    }
    return result;
  } catch (e) {
    console.error("[geocodeAddressToCoord] Error:", e);
    return null;
  }
}

export async function geocodeAddressWithGoogle(
  supabase: SupabaseClient,
  addressParts: {
    street?: string | null;
    street_number?: string | null;
    neighborhood?: string | null;
    cep?: string | null;
    city?: string | null;
  },
): Promise<{ lat: number; lon: number } | null> {
  const city = addressParts.city || "São Paulo";
  const parts: string[] = [];
  if (addressParts.street) {
    parts.push(addressParts.street_number ? `${addressParts.street}, ${addressParts.street_number}` : addressParts.street);
  }
  if (addressParts.neighborhood) parts.push(addressParts.neighborhood);
  if (addressParts.cep) parts.push(String(addressParts.cep).replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"));
  parts.push(city, "Brasil");
  const query = parts.filter(Boolean).join(", ");
  if (!query || query.length < 5) return null;
  try {
    const { data: autocompleteData, error: autocompleteError } = await supabase.functions.invoke<{
      predictions?: Array<{ placeId?: string }>;
      error?: string;
    }>("google-places-autocomplete", { body: { query } });
    if (autocompleteError || !autocompleteData?.predictions?.length) {
      if (autocompleteError) console.warn("[geocodeAddressWithGoogle] Autocomplete error:", autocompleteError);
      return null;
    }
    const placeId = autocompleteData.predictions[0].placeId;
    if (!placeId) return null;
    const { data: detailsData, error: detailsError } = await supabase.functions.invoke<{
      address?: { latitude?: number; longitude?: number };
      error?: string;
    }>("google-places-details", { body: { placeId } });
    if (detailsError || !detailsData?.address) {
      if (detailsError) console.warn("[geocodeAddressWithGoogle] Details error:", detailsError);
      return null;
    }
    const lat = Number(detailsData.address.latitude);
    const lon = Number(detailsData.address.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (e) {
    console.error("[geocodeAddressWithGoogle] Error:", e);
    return null;
  }
}

export type NearestUrbanReportRow = {
  id: string;
  protocol_code: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  location_address: string | null;
  neighborhood: string | null;
  severity: string | null;
  created_at: string;
  distance_meters: number;
};

export async function resolveUrbanCoordsForSimilarSearch(
  supabase: SupabaseClient,
  fields: Record<string, unknown>,
): Promise<{ lat: number; lon: number } | null> {
  const ula = fields.user_lat != null ? Number(fields.user_lat) : NaN;
  const ulo = fields.user_lon != null ? Number(fields.user_lon) : NaN;
  if (Number.isFinite(ula) && Number.isFinite(ulo)) {
    return { lat: ula, lon: ulo };
  }
  const addr = {
    street: (fields.street as string) || null,
    street_number: (fields.street_number as string) || null,
    neighborhood: (fields.neighborhood as string) || null,
    cep: (fields.cep as string) || null,
    city: (fields.city as string) || null,
  };
  if (!addr.street && !addr.neighborhood && !addr.cep) return null;
  const g = await geocodeAddressWithGoogle(supabase, addr);
  if (g) return g;
  return geocodeAddressToCoord(addr);
}

export async function fetchNearestUrbanReportsForSimilarity(
  supabase: SupabaseClient,
  lat: number,
  lon: number,
  category: string,
  excludeUserId: string | undefined,
  limit = 10,
  radiusMeters?: number,
): Promise<NearestUrbanReportRow[]> {
  const { data, error } = await supabase.rpc("nearest_urban_reports_by_distance", {
    p_lat: lat,
    p_lng: lon,
    p_category: category,
    p_exclude_user_id: excludeUserId ?? null,
    p_limit: limit,
    p_radius_meters: radiusMeters ?? null,
  });
  if (error) {
    console.error("[fetchNearestUrbanReportsForSimilarity]", error);
    return [];
  }
  return (data || []) as NearestUrbanReportRow[];
}

export type SimilarTransportReportRow = {
  id: string;
  protocol_code: string | null;
  report_type: string;
  description: string | null;
  occurrence_date: string;
  occurrence_time: string | null;
  location: string | null;
  severity: string | null;
  direction: string | null;
  created_at: string;
  line_code: string | null;
  line_name: string | null;
};

export async function fetchSimilarTransportReportsForSupport(
  supabase: SupabaseClient,
  fields: Record<string, unknown>,
  excludeUserId: string | undefined,
  limit = 10,
): Promise<SimilarTransportReportRow[]> {
  const reportType = String(fields.report_type || "").trim();
  if (!reportType) return [];

  const lineIdRaw = fields.line_id != null ? String(fields.line_id).trim() : "";
  const lineCodeRaw = fields.line_code != null ? String(fields.line_code).trim() : "";
  const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lineIdRaw);

  if (!uuidOk && !lineCodeRaw) return [];

  const { data, error } = await supabase.rpc("find_similar_transport_reports", {
    p_report_type: reportType,
    p_line_id: uuidOk ? lineIdRaw : null,
    p_line_code: uuidOk ? null : lineCodeRaw,
    p_exclude_user_id: excludeUserId ?? null,
    p_limit: limit,
  });

  if (error) {
    console.error("[fetchSimilarTransportReportsForSupport]", error);
    return [];
  }

  const rows = (data || []) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    protocol_code: (r.protocol_code as string | null) ?? null,
    report_type: String(r.report_type),
    description: (r.description as string | null) ?? null,
    occurrence_date: String(r.occurrence_date),
    occurrence_time: (r.occurrence_time as string | null) ?? null,
    location: (r.location as string | null) ?? null,
    severity: (r.severity as string | null) ?? null,
    direction: (r.direction as string | null) ?? null,
    created_at: String(r.created_at),
    line_code: (r.line_code as string | null) ?? null,
    line_name: (r.line_name as string | null) ?? null,
  }));
}

function formatNominatimReverseAddress(addr: Record<string, string | undefined> | undefined): string | null {
  if (!addr) return null;
  const road = addr.road || addr.pedestrian || addr.path || addr.residential;
  const num = addr.house_number;
  const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter;
  if (road && suburb) {
    return num ? `${road}, ${num} - ${suburb}` : `${road} - ${suburb}`;
  }
  if (road) return num ? `${road}, ${num}` : road;
  return null;
}

export async function reverseGeocodeLatLon(lat: number, lon: number): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY")?.trim();
  if (key) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${key}&language=pt-BR`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        status?: string;
        results?: Array<{ formatted_address?: string }>;
        error_message?: string;
      };
      if (data.status === "OK" && data.results?.[0]?.formatted_address) {
        return String(data.results[0].formatted_address).trim();
      }
      if (data.status && data.status !== "ZERO_RESULTS") {
        console.warn("[reverseGeocodeLatLon] Google:", data.status, data.error_message ?? "");
      }
    } catch (e) {
      console.warn("[reverseGeocodeLatLon] Google request failed:", e);
    }
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: "json",
      "accept-language": "pt-BR",
    })}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CamaraNaMao-SP/1.0 (participacao@camara.sp.gov.br)" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const fromAddr = formatNominatimReverseAddress(
      json.address as Record<string, string | undefined> | undefined,
    );
    if (fromAddr) return fromAddr;
    const dn = typeof json.display_name === "string" ? json.display_name.trim() : "";
    if (dn) {
      const parts = dn.split(",").map((p: string) => p.trim()).filter(Boolean);
      return parts.slice(0, 4).join(", ") || dn;
    }
  } catch (e) {
    console.warn("[reverseGeocodeLatLon] Nominatim failed:", e);
  }
  return null;
}
