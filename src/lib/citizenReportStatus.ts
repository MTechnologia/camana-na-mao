/**
 * HU-5.5: status canônicos de protocolo para relatos urbanos e de transporte.
 */
export const CITIZEN_REPORT_STATUS_VALUES = [
  "pending",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type CitizenReportStatus = (typeof CITIZEN_REPORT_STATUS_VALUES)[number];

export const CITIZEN_REPORT_STATUS_LABELS: Record<CitizenReportStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  rejected: "Rejeitado",
};

const STATUS_SYNONYMS: Record<string, CitizenReportStatus> = {
  pending: "pending",
  pendente: "pending",
  novo: "pending",
  aberto: "pending",
  in_progress: "in_progress",
  em_andamento: "in_progress",
  "em andamento": "in_progress",
  andamento: "in_progress",
  "em analise": "in_progress",
  "em análise": "in_progress",
  resolved: "resolved",
  resolvido: "resolved",
  fechado: "resolved",
  closed: "resolved",
  concluido: "resolved",
  "concluído": "resolved",
  rejected: "rejected",
  rejeitado: "rejected",
  indeferido: "rejected",
  cancelado: "rejected",
};

export function normalizeCitizenReportStatus(
  raw: string | null | undefined,
): CitizenReportStatus {
  if (raw == null || String(raw).trim() === "") return "pending";
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  const mapped = STATUS_SYNONYMS[key];
  if (mapped) return mapped;
  const underscored = key.replace(/\s+/g, "_");
  const mapped2 = STATUS_SYNONYMS[underscored];
  if (mapped2) return mapped2;
  if ((CITIZEN_REPORT_STATUS_VALUES as readonly string[]).includes(key)) {
    return key as CitizenReportStatus;
  }
  return "pending";
}

export function citizenReportStatusLabel(status: CitizenReportStatus): string {
  return CITIZEN_REPORT_STATUS_LABELS[status] ?? status;
}

/** Classes para Badge (outline + cor semântica). */
export function citizenReportStatusBadgeClassNames(status: CitizenReportStatus): string {
  switch (status) {
    case "pending":
      return "border-amber-500/50 text-amber-800 dark:text-amber-200 bg-amber-500/10";
    case "in_progress":
      return "border-sky-500/50 text-sky-800 dark:text-sky-200 bg-sky-500/10";
    case "resolved":
      return "border-emerald-500/50 text-emerald-800 dark:text-emerald-200 bg-emerald-500/10";
    case "rejected":
      return "border-destructive/40 text-destructive bg-destructive/10";
    default:
      return "";
  }
}

/** Contagem PostgREST embutida: `relation(count)` → `[{ count: n }]`. */
export function embeddedRelationCount(row: Record<string, unknown>, key: string): number {
  const agg = row[key];
  if (!Array.isArray(agg) || agg.length === 0) return 0;
  const first = agg[0] as { count?: number };
  return Number(first?.count ?? 0);
}
