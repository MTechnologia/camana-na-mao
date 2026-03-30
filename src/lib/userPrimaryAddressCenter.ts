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

export async function getUserPrimaryAddressCenter(
  userId: string,
): Promise<UserPrimaryAddressCenterResult> {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("street, number, neighborhood, city, state, latitude, longitude")
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
  return { center: null, reason: "missing_coordinates" };
}
