export type AuditRangePreset = "24h" | "7d" | "30d" | "custom" | "all";

export const AUDIT_FILTER_ALL = "__all__";

export const AUDIT_ACTION_OPTIONS = [
  { value: AUDIT_FILTER_ALL, label: "Todas as ações" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "create", label: "Criar" },
  { value: "update", label: "Atualizar" },
  { value: "delete", label: "Deletar" },
  { value: "export", label: "Exportar" },
  { value: "role_changed", label: "Mudança de papel" },
  { value: "triage_changed", label: "Triagem alterada" },
  { value: "commission_referral_changed", label: "Encaminhamento alterado" },
  { value: "anomaly_changed", label: "Anomalia alterada" },
  { value: "user_suspension_changed", label: "Suspensão de usuário" },
] as const;

export interface AuditExportFilterState {
  searchTerm: string;
  actionFilter: string;
  entityFilter: string;
  userFilter: string;
  rangePreset: AuditRangePreset;
  customStart: string;
  customEnd: string;
}

export function rangeForAuditPreset(preset: AuditRangePreset): {
  start?: Date;
  end?: Date;
} {
  const now = new Date();
  if (preset === "24h") {
    return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
  }
  if (preset === "7d") {
    return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
  }
  if (preset === "30d") {
    return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
  }
  return {};
}

export function buildAuditLogQueryFilters(
  filters: AuditExportFilterState,
  limit = 500,
): Record<string, unknown> {
  const query: Record<string, unknown> = { limit };

  if (filters.actionFilter !== AUDIT_FILTER_ALL) {
    query.action = filters.actionFilter;
  }
  if (filters.entityFilter !== AUDIT_FILTER_ALL) {
    query.entityType = filters.entityFilter;
  }
  if (filters.userFilter !== AUDIT_FILTER_ALL) {
    query.userId = filters.userFilter;
  }

  if (filters.rangePreset === "custom") {
    if (filters.customStart) query.startDate = new Date(filters.customStart);
    if (filters.customEnd) query.endDate = new Date(`${filters.customEnd}T23:59:59`);
  } else if (filters.rangePreset !== "all") {
    const { start, end } = rangeForAuditPreset(filters.rangePreset);
    if (start) query.startDate = start;
    if (end) query.endDate = end;
  }

  return query;
}
