import type { SupabaseClient } from "@supabase/supabase-js";

import { createSseResponse } from "./lib-index-sse.ts";
import type { NextFieldInfo } from "./lib-next-missing-field.ts";

type ExecuteToolResult = {
  success: boolean;
  message: string;
};

type ServicesFlowArgs = {
  accumulatedFields: Record<string, unknown>;
  lightJourneyMarker: string;
  nextFieldInfo: NextFieldInfo;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
};

type ServicesFlowResult = {
  response?: Response;
};

function buildServicesProgressContent(
  accumulatedFields: Record<string, unknown>,
  content: string,
): string {
  return `[COLLECTION_PROGRESS:services:${JSON.stringify(accumulatedFields)}]${content}`;
}

function buildServicesToolArgs(accumulatedFields: Record<string, unknown>): Record<string, unknown> {
  const defaultRadius = 2000;
  return {
    service_type: accumulatedFields.service_type,
    district: accumulatedFields.neighborhood || undefined,
    limit: 10,
    radius_meters: accumulatedFields.radius_meters ?? defaultRadius,
    min_rating: accumulatedFields.min_rating ?? 0,
    search_query: accumulatedFields.search_query || undefined,
  };
}

export async function handleDeterministicServicesFlow(
  args: ServicesFlowArgs,
): Promise<ServicesFlowResult> {
  const {
    accumulatedFields,
    lightJourneyMarker,
    nextFieldInfo,
    supabase,
    userId,
    lib,
  } = args;

  if (nextFieldInfo.field && nextFieldInfo.prompt) {
    let responseContent = lightJourneyMarker + buildServicesProgressContent(accumulatedFields, nextFieldInfo.prompt);
    if (nextFieldInfo.picker) {
      responseContent += `\n\n${nextFieldInfo.picker}`;
    }
    console.log("[ai-orchestrator] Services: deterministic ask", nextFieldInfo.field);
    return { response: createSseResponse(responseContent, lib.corsHeaders) };
  }

  if (!nextFieldInfo.field && accumulatedFields.service_type) {
    const method = accumulatedFields.location_method;
    const hasCep = !!(accumulatedFields.cep && String(accumulatedFields.cep).replace(/\D/g, "").length === 8);
    const hasAddress = !!(accumulatedFields.street && accumulatedFields.neighborhood);
    const hasUserCoords = accumulatedFields.user_lat != null && accumulatedFields.user_lon != null;
    const hasGpsCoords = method === "gps" && hasUserCoords;
    const hasLocation = (method === "manual" && (hasCep || hasAddress)) ||
      method === "registered_address" ||
      hasGpsCoords ||
      (method === "manual" && hasUserCoords);

    if (hasLocation) {
      const toolArgs = buildServicesToolArgs(accumulatedFields);
      if (hasUserCoords) {
        toolArgs.user_lat = accumulatedFields.user_lat;
        toolArgs.user_lon = accumulatedFields.user_lon;
      } else if (method === "manual" && (hasCep || hasAddress)) {
        const coords = await lib.geocodeAddressToCoord({
          street: String(accumulatedFields.street ?? ""),
          street_number: String(accumulatedFields.street_number ?? ""),
          neighborhood: String(accumulatedFields.neighborhood ?? ""),
          cep: String(accumulatedFields.cep ?? ""),
          city: "São Paulo",
        });
        if (coords) {
          toolArgs.user_lat = coords.lat;
          toolArgs.user_lon = coords.lon;
          accumulatedFields.user_lat = coords.lat;
          accumulatedFields.user_lon = coords.lon;
        }
      } else if (method === "registered_address") {
        const { data: addr } = await supabase
          .from("user_addresses")
          .select("latitude, longitude, street, number, neighborhood, zip_code, city")
          .eq("user_id", userId)
          .eq("is_primary", true)
          .maybeSingle();

        if (addr?.latitude != null && addr?.longitude != null) {
          toolArgs.user_lat = Number(addr.latitude);
          toolArgs.user_lon = Number(addr.longitude);
        } else if (addr?.street && addr?.neighborhood) {
          let coords = await lib.geocodeAddressWithGoogle(supabase, {
            street: addr.street,
            street_number: addr.number,
            neighborhood: addr.neighborhood,
            cep: addr.zip_code,
            city: addr.city || "São Paulo",
          });
          if (!coords) {
            coords = await lib.geocodeAddressToCoord({
              street: addr.street,
              street_number: addr.number,
              neighborhood: addr.neighborhood,
              cep: addr.zip_code,
              city: addr.city || "São Paulo",
            });
          }
          if (coords) {
            toolArgs.user_lat = coords.lat;
            toolArgs.user_lon = coords.lon;
          }
        }
      }

      let toolResult: ExecuteToolResult | null = null;
      try {
        toolResult = await lib.executeTool(
          "find_nearby_services",
          toolArgs,
          userId,
          supabase,
          accumulatedFields,
        ) as ExecuteToolResult;
      } catch (e) {
        console.error("[ai-orchestrator] find_nearby_services error:", e);
      }
      if (toolResult?.success) {
        const responseContent = `${lightJourneyMarker || ""}[COLLECTION_PROGRESS:services:{}]${toolResult.message}`;
        console.log("[ai-orchestrator] Services: find_nearby_services completed");
        return { response: createSseResponse(responseContent, lib.corsHeaders) };
      }
    }
  }

  return {};
}
