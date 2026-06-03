import type { TriagePriority } from "@/lib/triage";

export type ReportWorkflowStage =
  | "awaiting_triage"
  | "triaged"
  | "referred"
  | "in_analysis"
  | "resolved";

export type ReportPriority = "urgent" | "high" | "normal" | "low";

export type ReportQueueTab = "triage" | "all" | "referrals" | "tracking";

export type ReportTimelineEvent = {
  id: string;
  at: string;
  label: string;
  detail?: string;
  actor?: string;
};

export type ReportReferral = {
  /** Linha em `council_member_referrals` — usado para atualizar em vez de duplicar. */
  councilReferralId?: string;
  commissionId: string;
  commissionName: string;
  councillorId: string;
  councillorName: string;
  referredAt: string;
  matchScore: number;
  note?: string;
};

export type UrbanReportRecord = {
  id: string;
  protocol: string;
  title: string;
  summary: string;
  category: string;
  region: string;
  district: string;
  stage: ReportWorkflowStage;
  priority?: ReportPriority;
  /** Prioridade P0–P3 (triagem formal ou inferida — igual ao kanban). */
  triagePriority?: TriagePriority | null;
  /** Responsável na triagem (comissão temática do encaminhamento mais recente). */
  responsibleId?: string | null;
  responsibleName?: string | null;
  /** Drill-down do funil de encaminhamentos a vereador. */
  councilReferralId?: string;
  councilReferralStatus?: string;
  councilReferralStatusLabel?: string;
  councilMemberName?: string;
  createdAt: string;
  updatedAt: string;
  triagedAt?: string;
  triagedBy?: string;
  triageNote?: string;
  referral?: ReportReferral;
  timeline: ReportTimelineEvent[];
};

export type ThematicCommission = {
  id: string;
  name: string;
  themes: string[];
  activeReferrals: number;
};
