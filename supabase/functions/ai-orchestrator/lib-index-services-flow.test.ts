import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleDeterministicServicesFlow } from "./lib-index-services-flow.ts";

Deno.test("handleDeterministicServicesFlow retorna pergunta determinística com picker", async () => {
  const result = await handleDeterministicServicesFlow({
    accumulatedFields: { service_type: "ubs" },
    lightJourneyMarker: "[LIGHT_JOURNEY:services]",
    nextFieldInfo: {
      field: "location_method",
      picker: "[LOCATION_METHOD_PICKER]",
      prompt: "[FIELD_REQUEST:location_method]Como deseja informar sua localização?",
    },
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[LIGHT_JOURNEY:services]"), true);
  assertEquals(text.includes("[FIELD_REQUEST:location_method]"), true);
  assertEquals(text.includes("[LOCATION_METHOD_PICKER]"), true);
});

Deno.test("handleDeterministicServicesFlow executa find_nearby_services quando localização está completa", async () => {
  let calledToolName = "";
  let calledArgs: Record<string, unknown> | null = null;

  const accumulatedFields: Record<string, unknown> = {
    service_type: "ubs",
    location_method: "manual",
    neighborhood: "Centro",
    user_lat: -23.55,
    user_lon: -46.63,
  };

  const result = await handleDeterministicServicesFlow({
    accumulatedFields,
    lightJourneyMarker: "[LIGHT_JOURNEY:services]",
    nextFieldInfo: {
      field: null,
      picker: null,
      prompt: null,
    },
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      executeTool: async (toolName: string, args: Record<string, unknown>) => {
        calledToolName = toolName;
        calledArgs = args;
        return { success: true, message: "Lista de serviços" };
      },
    } as any,
  });

  assertEquals(calledToolName, "find_nearby_services");
  assertExists(calledArgs);
  assertEquals(calledArgs!.district, "Centro");
  assertEquals(calledArgs!.radius_meters, 2000);
  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[COLLECTION_PROGRESS:services:{}]"), true);
  assertEquals(text.includes("Lista de serviços"), true);
});
