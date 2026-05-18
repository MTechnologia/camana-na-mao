/** Alinhado a `src/lib/closeServiceVisitDeparture.ts` — não sobrescreve departed_at existente. */
export type VisitCloseStatus = "completed" | "skipped" | "expired";

export function buildVisitCloseUpdate(
  status: VisitCloseStatus,
  existingDepartedAt: string | null | undefined,
  atIso?: string,
): { status: VisitCloseStatus; departed_at?: string } {
  if (existingDepartedAt) {
    return { status };
  }
  return { status, departed_at: atIso ?? new Date().toISOString() };
}
