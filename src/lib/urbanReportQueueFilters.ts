import type {
  ReportQueueTab,
  ReportWorkflowStage,
  UrbanReportRecord,
} from "@/types/urbanReportManagement";

/** Filtro acionado pelos cartões de KPI (prioridade sobre a aba da toolbar). */
export type ReportsStageFilter = ReportWorkflowStage | "in_referral";

export function filterReportsForQueue(
  list: UrbanReportRecord[],
  queueTab: ReportQueueTab,
  stageFilter: ReportsStageFilter | null,
): UrbanReportRecord[] {
  if (stageFilter === "in_referral") {
    return list.filter((r) => r.stage === "referred" || r.stage === "in_analysis");
  }
  if (stageFilter) {
    return list.filter((r) => r.stage === stageFilter);
  }

  switch (queueTab) {
    case "triage":
      return list.filter((r) => r.stage === "awaiting_triage");
    case "referrals":
      return list.filter((r) => r.stage === "referred" || r.stage === "in_analysis");
    case "tracking":
      return list.filter((r) => r.stage !== "awaiting_triage");
    default:
      return list;
  }
}

export function queueTabForStageFilter(filter: ReportsStageFilter): ReportQueueTab {
  switch (filter) {
    case "awaiting_triage":
      return "triage";
    case "triaged":
      return "tracking";
    case "in_referral":
      return "referrals";
    case "resolved":
      return "all";
    default:
      return "all";
  }
}
