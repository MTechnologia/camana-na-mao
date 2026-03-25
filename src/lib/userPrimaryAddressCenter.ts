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
export async function getUserPrimaryAddressCenter(
  userId: string,
  googleMapsApiKey: string | undefined,
): Promise<CepCenter | null> {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("street, number, neighborhood, city, state, latitude, longitude")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error || !data) return null;

  const label = buildAddressLabel({
    street: data.street,
    number: data.number,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
  });

  if (data.latitude != null && data.longitude != null) {
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      label,
    };
  }

  if (!googleMapsApiKey?.trim()) return null;

  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(label)}&key=${googleMapsApiKey}&language=pt-BR`;
  const geoRes = await fetch(geocodeUrl);
  const geoData = await geoRes.json();
  const first = geoData?.results?.[0];
  if (!first?.geometry?.location) return null;
  const { lat, lng } = first.geometry.location;
  return {
    latitude: lat,
    longitude: lng,
    label: first.formatted_address ?? label,
  };
}
