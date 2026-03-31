import { supabase } from "@/integrations/supabase/client";
import type { CepCenter } from "@/components/map/CepSearchCard";

function buildAddressLabel(parts: {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}) {
  const { street, number, neighborhood, city, state } = parts;
  return [street, number, neighborhood, `${city} - ${state}`].filter(Boolean).join(", ");
}

/** Centro (lat/lng + rótulo) do endereço primário do usuário, ou null. */
export type UserPrimaryAddressCenterResult =
  | { center: CepCenter; reason: "ok" }
  | { center: null; reason: "not_found" | "missing_coordinates" };

async function geocodeAddressViaPlaces(fullAddress: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { data: autocompleteData, error: autocompleteError } = await supabase.functions.invoke(
      "google-places-autocomplete",
      { body: { query: fullAddress } },
    );
    if (autocompleteError || !autocompleteData?.predictions?.length) return null;

    const placeId = autocompleteData.predictions[0]?.place_id;
    if (!placeId) return null;

    const { data: detailsData, error: detailsError } = await supabase.functions.invoke(
      "google-places-details",
      { body: { placeId } },
    );
    if (detailsError) return null;

    const lat = detailsData?.structuredAddress?.latitude;
    const lng = detailsData?.structuredAddress?.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      return { latitude: lat, longitude: lng };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getUserPrimaryAddressCenter(
  userId: string,
): Promise<UserPrimaryAddressCenterResult> {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("id, street, number, neighborhood, city, state, zip_code, latitude, longitude")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error || !data) return { center: null, reason: "not_found" };

  const label = buildAddressLabel({
    street: data.street,
    number: data.number,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
  });

  if (data.latitude != null && data.longitude != null) {
    return {
      center: {
        latitude: data.latitude,
        longitude: data.longitude,
        label,
      },
      reason: "ok",
    };
  }

  // Fallback: tenta geocodificar endereço salvo quando lat/lng estiverem ausentes.
  const fullAddress = [
    data.street,
    data.number,
    data.neighborhood,
    data.city,
    data.state,
    data.zip_code,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");

  const geocoded = fullAddress ? await geocodeAddressViaPlaces(fullAddress) : null;
  if (geocoded) {
    const { error: updateError } = await supabase
      .from("user_addresses")
      .update({
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
      })
      .eq("id", data.id)
      .eq("user_id", userId);

    if (!updateError) {
      return {
        center: {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          label,
        },
        reason: "ok",
      };
    }
  }
  return { center: null, reason: "missing_coordinates" };
}
