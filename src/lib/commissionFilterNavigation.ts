import type { GlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import type { ReportQueueTab } from "@/types/urbanReportManagement";

/** Query usada em Gestão de relatos e links a partir de comissões. */
export const COMMISSION_FILTER_QUERY = "responsible";

/** Query usada no Kanban de triagem. */
export const TRIAGE_COMMISSION_FILTER_QUERY = "commission";

/** Aba da fila em Gestão de relatos (`triage` | `all` | `referrals` | `tracking`). */
export const REPORTS_QUEUE_TAB_QUERY = "tab";

const REPORT_QUEUE_TABS: ReportQueueTab[] = ["triage", "all", "referrals", "tracking"];

export function parseCommissionIdsFromSearchParams(params: URLSearchParams): string[] {
  const raw = params.get(COMMISSION_FILTER_QUERY) ?? params.get(TRIAGE_COMMISSION_FILTER_QUERY);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseReportsQueueTabFromSearchParams(
  params: URLSearchParams,
): ReportQueueTab | null {
  const raw = params.get(REPORTS_QUEUE_TAB_QUERY);
  if (!raw) return null;
  return REPORT_QUEUE_TABS.includes(raw as ReportQueueTab) ? (raw as ReportQueueTab) : null;
}

/** Período/região/categoria na URL para manter o mesmo recorte ao abrir Gestão de relatos. */
export function parseGlobalFiltersFromSearchParams(
  params: URLSearchParams,
): Partial<GlobalFilters> {
  const out: Partial<GlobalFilters> = {};
  const period = params.get("period");
  const region = params.get("region");
  const category = params.get("category");
  if (period) out.period = period;
  if (region) out.region = region;
  if (category) out.category = category;
  return out;
}

export function reportsManagementUrlForCommission(
  commissionId: string,
  options?: {
    queueTab?: ReportQueueTab;
    global?: Partial<GlobalFilters>;
  },
): string {
  const params = new URLSearchParams();
  params.set(COMMISSION_FILTER_QUERY, commissionId);
  /** `all` — qualquer etapa com encaminhamento temático à comissão. */
  params.set(REPORTS_QUEUE_TAB_QUERY, options?.queueTab ?? "all");
  if (options?.global?.period) params.set("period", options.global.period);
  if (options?.global?.region) params.set("region", options.global.region);
  if (options?.global?.category) params.set("category", options.global.category);
  return `/admin/reports?${params.toString()}`;
}

export function triageKanbanUrlForCommission(commissionId: string): string {
  return `/admin/triagem?${TRIAGE_COMMISSION_FILTER_QUERY}=${encodeURIComponent(commissionId)}`;
}

/** Filtro por encaminhamento a vereador (`council_member_referrals`). */
export const COUNCIL_REFERRAL_QUERY = "councilReferral";

export type CouncilReferralFilter = "any" | "pending" | "sent" | "acknowledged" | "resolved";

const COUNCIL_REFERRAL_VALUES: CouncilReferralFilter[] = [
  "any",
  "pending",
  "sent",
  "acknowledged",
  "resolved",
];

export function parseCouncilReferralFilterFromSearchParams(
  params: URLSearchParams,
): CouncilReferralFilter | null {
  const raw = params.get(COUNCIL_REFERRAL_QUERY);
  if (!raw) return null;
  return COUNCIL_REFERRAL_VALUES.includes(raw as CouncilReferralFilter)
    ? (raw as CouncilReferralFilter)
    : null;
}

/** Status do funil (rótulo PT) → filtro na URL. */
export function councilReferralFilterFromFunnelLabel(label: string): CouncilReferralFilter | null {
  const map: Record<string, CouncilReferralFilter> = {
    Pendentes: "pending",
    Enviados: "sent",
    Reconhecidos: "acknowledged",
    Resolvidos: "resolved",
  };
  return map[label] ?? null;
}

/** Filtro por vereador (`council_member_referrals.council_member_id`). */
export const COUNCILLOR_FILTER_QUERY = "councillor";

export function parseCouncilMemberIdsFromSearchParams(params: URLSearchParams): string[] {
  const raw = params.get(COUNCILLOR_FILTER_QUERY);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function reportsManagementUrlForCouncilMember(
  councilMemberId: string,
  options?: {
    queueTab?: ReportQueueTab;
    global?: Partial<GlobalFilters>;
    councilReferral?: CouncilReferralFilter;
  },
): string {
  const params = new URLSearchParams();
  params.set(COUNCILLOR_FILTER_QUERY, councilMemberId);
  params.set(COUNCIL_REFERRAL_QUERY, options?.councilReferral ?? "any");
  params.set(REPORTS_QUEUE_TAB_QUERY, options?.queueTab ?? "all");
  if (options?.global?.period) params.set("period", options.global.period);
  if (options?.global?.region) params.set("region", options.global.region);
  if (options?.global?.category) params.set("category", options.global.category);
  return `/admin/reports?${params.toString()}`;
}

export function reportsManagementUrlForCouncilReferral(
  filter: CouncilReferralFilter,
  options?: {
    queueTab?: ReportQueueTab;
    global?: Partial<GlobalFilters>;
  },
): string {
  const params = new URLSearchParams();
  params.set(COUNCIL_REFERRAL_QUERY, filter);
  params.set(REPORTS_QUEUE_TAB_QUERY, options?.queueTab ?? "all");
  if (options?.global?.period) params.set("period", options.global.period);
  if (options?.global?.region) params.set("region", options.global.region);
  if (options?.global?.category) params.set("category", options.global.category);
  return `/admin/reports?${params.toString()}`;
}
