import type { SupabaseClient } from "@supabase/supabase-js";

export type VisitCloseStatus = "completed" | "skipped" | "expired";

/** ISO de saída apenas se ainda não houver `departed_at` (não sobrescreve GPS). */
export function resolveDepartedAtIso(
  existingDepartedAt: string | null | undefined,
  at: Date = new Date(),
): string | undefined {
  if (existingDepartedAt) return undefined;
  return at.toISOString();
}

export function buildVisitCloseUpdate(
  status: VisitCloseStatus,
  existingDepartedAt: string | null | undefined,
  at?: Date,
): { status: VisitCloseStatus; departed_at?: string } {
  const departedAt = resolveDepartedAtIso(existingDepartedAt, at);
  if (departedAt) {
    return { status, departed_at: departedAt };
  }
  return { status };
}

export async function closeServiceVisitWithDeparture(
  supabase: SupabaseClient,
  params: {
    visitId: string;
    userId: string;
    status: VisitCloseStatus;
    at?: Date;
  },
): Promise<{ error: Error | null }> {
  const { visitId, userId, status, at } = params;

  const { data, error: loadError } = await supabase
    .from("service_visits")
    .select("departed_at")
    .eq("id", visitId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError) {
    return { error: loadError };
  }
  if (!data) {
    return { error: new Error("Visita não encontrada") };
  }

  const patch = buildVisitCloseUpdate(
    status,
    (data.departed_at as string | null) ?? null,
    at,
  );

  const { error: updateError } = await supabase
    .from("service_visits")
    .update(patch)
    .eq("id", visitId)
    .eq("user_id", userId);

  return { error: updateError ?? null };
}

/** Exibição de duração no histórico (0 min GPS → "menos de 1 min"). */
export function formatVisitDurationMs(ms: number): string {
  if (ms < 0) return "—";
  if (ms < 60_000) return "menos de 1 min";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h} h ${rest} min` : `${h} h`;
}
