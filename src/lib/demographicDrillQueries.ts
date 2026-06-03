import { supabase } from "@/integrations/supabase/client";
import {
  NOT_INFORMED,
  ageFromBirthDate,
  ageToGroup,
  genderDbValues,
  raceDbValues,
  resolveAgeGroupKey,
  resolveGenderKey,
  resolveRaceKey,
  resolveSocialClassKey,
  socialClassDbValues,
} from "@/lib/demographicDrill";

export type DemographicDrillFilters = {
  startDate?: string;
  endDate?: string;
};

export type DemographicDrillResult = {
  urban: Record<string, unknown>[];
  transport: Record<string, unknown>[];
  /** Avaliações publicadas no recorte (não viram DrillReport individual). */
  evaluationCount: number;
};

type RpcDrillPayload = {
  urban: Record<string, unknown>[] | null;
  transport: Record<string, unknown>[] | null;
  evaluation_count: number;
};

async function callDemographicDrillRpc(
  dimension: "gender" | "race" | "social_class" | "age_group",
  values: string[],
  filters?: DemographicDrillFilters,
): Promise<DemographicDrillResult> {
  const startDateISO = filters?.startDate ? new Date(filters.startDate).toISOString() : null;
  const endDateISO = filters?.endDate ? new Date(filters.endDate).toISOString() : null;

  const { data, error } = await supabase.rpc("get_demographic_drill_reports", {
    p_dimension: dimension,
    p_values: values,
    p_start_date: startDateISO,
    p_end_date: endDateISO,
  });

  if (error) throw error;

  const payload = (data ?? {}) as RpcDrillPayload;

  return {
    urban: Array.isArray(payload.urban) ? payload.urban : [],
    transport: Array.isArray(payload.transport) ? payload.transport : [],
    evaluationCount: payload.evaluation_count ?? 0,
  };
}

function isRpcMissing(error: unknown): boolean {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";
  return (
    code === "PGRST202" ||
    code === "42883" ||
    msg.includes("get_demographic_drill_reports") ||
    msg.includes("Could not find the function")
  );
}

type DemoRow = {
  user_id: string;
  gender: string | null;
  race: string | null;
  social_class: string | null;
  birth_date: string | null;
};

async function fetchDemoMap(): Promise<Map<string, DemoRow>> {
  const { data, error } = await supabase
    .from("user_demographics")
    .select("user_id, gender, race, social_class, birth_date");
  if (error) throw error;
  const map = new Map<string, DemoRow>();
  for (const row of data ?? []) {
    map.set(row.user_id as string, row as DemoRow);
  }
  return map;
}

function userMatchesValues(
  userId: string | null | undefined,
  demoMap: Map<string, DemoRow>,
  dimension: "gender" | "race" | "social_class" | "age_group",
  values: string[],
): boolean {
  if (dimension === "age_group") {
    const target = values[0];
    if (target === NOT_INFORMED) {
      if (!userId) return true;
      const demo = demoMap.get(userId);
      return !demo?.birth_date;
    }
    if (!userId) return false;
    const demo = demoMap.get(userId);
    if (!demo) return false;
    return ageToGroup(ageFromBirthDate(demo.birth_date)) === target;
  }

  const field = dimension;
  const includesNotInformed = values.includes(NOT_INFORMED);

  if (!userId) return includesNotInformed;

  const demo = demoMap.get(userId);
  if (!demo) return includesNotInformed;

  const raw = demo[field];
  if (raw == null || raw === "") return includesNotInformed;

  return values.includes(raw);
}

function applyDateFilter<T extends { created_at: string }>(
  rows: T[],
  filters?: DemographicDrillFilters,
): T[] {
  if (!filters?.startDate && !filters?.endDate) return rows;
  const startMs = filters.startDate ? new Date(filters.startDate).setHours(0, 0, 0, 0) : null;
  const endMs = filters.endDate ? new Date(filters.endDate).setHours(23, 59, 59, 999) : null;
  return rows.filter((row) => {
    const t = new Date(row.created_at).getTime();
    if (Number.isNaN(t)) return false;
    if (startMs != null && t < startMs) return false;
    if (endMs != null && t > endMs) return false;
    return true;
  });
}

async function fetchDrillReportsClientSide(
  dimension: "gender" | "race" | "social_class" | "age_group",
  values: string[],
  filters?: DemographicDrillFilters,
): Promise<DemographicDrillResult> {
  const [demoMap, urbanRes, transportRes, ratingsRes] = await Promise.all([
    fetchDemoMap(),
    supabase.from("urban_reports").select("*"),
    supabase.from("transport_reports").select("*"),
    supabase
      .from("service_ratings")
      .select("id, user_id, created_at")
      .eq("publication_status", "published"),
  ]);

  if (urbanRes.error) throw urbanRes.error;
  if (transportRes.error) throw transportRes.error;

  const urbanAll = applyDateFilter(
    (urbanRes.data ?? []) as Array<
      Record<string, unknown> & { created_at: string; user_id: string | null }
    >,
    filters,
  );
  const transportAll = applyDateFilter(
    (transportRes.data ?? []) as Array<
      Record<string, unknown> & { created_at: string; user_id: string | null }
    >,
    filters,
  );
  const ratingsAll = applyDateFilter(
    (ratingsRes.data ?? []) as Array<{ id: string; user_id: string | null; created_at: string }>,
    filters,
  );

  const matches = (userId: string | null | undefined) =>
    userMatchesValues(userId, demoMap, dimension, values);

  return {
    urban: urbanAll.filter((r) => matches(r.user_id as string | null)),
    transport: transportAll.filter((r) => matches(r.user_id as string | null)),
    evaluationCount: ratingsAll.filter((r) => matches(r.user_id)).length,
  };
}

async function fetchDrillReports(
  dimension: "gender" | "race" | "social_class" | "age_group",
  rawValue: string,
  filters?: DemographicDrillFilters,
): Promise<DemographicDrillResult> {
  const values = valuesForDimension(dimension, rawValue);
  try {
    return await callDemographicDrillRpc(dimension, values, filters);
  } catch (error) {
    if (!isRpcMissing(error)) throw error;
    return fetchDrillReportsClientSide(dimension, values, filters);
  }
}

function valuesForDimension(
  dimension: "gender" | "race" | "social_class" | "age_group",
  rawValue: string,
): string[] {
  if (dimension === "gender") {
    const key = resolveGenderKey(rawValue);
    return key === NOT_INFORMED ? [NOT_INFORMED] : genderDbValues(key);
  }
  if (dimension === "race") {
    const key = resolveRaceKey(rawValue);
    return key === NOT_INFORMED ? [NOT_INFORMED] : raceDbValues(key);
  }
  if (dimension === "social_class") {
    const key = resolveSocialClassKey(rawValue);
    return key === NOT_INFORMED ? [NOT_INFORMED] : socialClassDbValues(key);
  }
  const key = resolveAgeGroupKey(rawValue);
  return [key];
}

export async function fetchDrillReportsByGender(
  rawValue: string,
  filters?: DemographicDrillFilters,
): Promise<DemographicDrillResult> {
  return fetchDrillReports("gender", rawValue, filters);
}

export async function fetchDrillReportsByRace(
  rawValue: string,
  filters?: DemographicDrillFilters,
): Promise<DemographicDrillResult> {
  return fetchDrillReports("race", rawValue, filters);
}

export async function fetchDrillReportsBySocialClass(
  rawValue: string,
  filters?: DemographicDrillFilters,
): Promise<DemographicDrillResult> {
  return fetchDrillReports("social_class", rawValue, filters);
}

export async function fetchDrillReportsByAgeGroup(
  rawValue: string,
  filters?: DemographicDrillFilters,
): Promise<DemographicDrillResult> {
  return fetchDrillReports("age_group", rawValue, filters);
}

export function appendEvaluationNote(insight: string, evaluationCount: number): string {
  if (evaluationCount <= 0) return insight;
  return `${insight} Há também ${evaluationCount} avaliação(ões) de serviço neste recorte (listagem individual indisponível neste painel).`;
}
