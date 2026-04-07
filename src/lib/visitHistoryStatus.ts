export type VisitHistoryUiStatus = "open_for_rating" | "evaluated" | "expired" | "skipped";

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;

/** Regras de exibição: pendente + dentro de 48h + antes de expires_at → pode avaliar. */
export function getVisitHistoryUiStatus(visit: {
  status: string;
  created_at: string;
  expires_at: string;
}): VisitHistoryUiStatus {
  const now = Date.now();
  if (visit.status === "completed") return "evaluated";
  if (visit.status === "skipped") return "skipped";
  if (visit.status === "expired") return "expired";
  const created = new Date(visit.created_at).getTime();
  const within48h = now - created <= FORTY_EIGHT_H_MS;
  const beforeExpires = new Date(visit.expires_at).getTime() > now;
  if (visit.status === "pending" && within48h && beforeExpires) return "open_for_rating";
  return "expired";
}
