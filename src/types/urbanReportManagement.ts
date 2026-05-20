export type ReportWorkflowStage =
  | 'awaiting_triage'
  | 'triaged'
  | 'referred'
  | 'in_analysis'
  | 'resolved';

export type ReportPriority = 'urgent' | 'high' | 'normal' | 'low';

export type ReportQueueTab = 'triage' | 'all' | 'referrals' | 'tracking';

export type ReportTimelineEvent = {
  id: string;
  at: string;
  label: string;
  detail?: string;
  actor?: string;
};

export type ReportReferral = {
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
