export const TRANSPORT_SEVERITY_ORDER = ["baixa", "media", "alta", "critica"] as const;
export type TransportSeverityStep = (typeof TRANSPORT_SEVERITY_ORDER)[number];

export function applyPersonalImpactToSeverity(
  baseSeverity: string,
  personalImpactScore: number,
): TransportSeverityStep {
  const normalized = String(baseSeverity || "media").toLowerCase();
  let idx = TRANSPORT_SEVERITY_ORDER.indexOf(normalized as TransportSeverityStep);
  if (idx < 0) idx = 1;
  let bump = 0;
  if (personalImpactScore >= 5) bump = 2;
  else if (personalImpactScore >= 4) bump = 1;
  else if (personalImpactScore >= 3) bump = 1;
  const next = Math.min(TRANSPORT_SEVERITY_ORDER.length - 1, idx + bump);
  return TRANSPORT_SEVERITY_ORDER[next];
}
