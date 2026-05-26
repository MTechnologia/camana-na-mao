import type { TriagePriority } from '@/lib/triage';
import { isTriagePriority } from '@/lib/triagePriority';
import type { ReportWorkflowStage } from '@/types/urbanReportManagement';
import { normalizeCitizenReportStatus } from '@/lib/citizenReportStatus';

export type DeriveWorkflowStageInput = {
  dbStatus: string | null | undefined;
  /** Prioridade formal em `report_triage` (não usa inferência n8n/severidade). */
  formalTriagePriority: TriagePriority | null;
  hasCommissionReferral: boolean;
  hasCouncilReferral: boolean;
};

/** Mapeia estágio do funil da gestão urbana para `urban_reports.status` canônico. */
export function stageToDbStatus(stage: ReportWorkflowStage): string {
  switch (stage) {
    case 'awaiting_triage':
      return 'pending';
    case 'triaged':
    case 'referred':
    case 'in_analysis':
      return 'in_progress';
    case 'resolved':
      return 'resolved';
    default:
      return 'pending';
  }
}

/** Reconstrói estágio do funil a partir do status gravado no banco. */
export function dbStatusToWorkflowStage(status: string | null | undefined): ReportWorkflowStage {
  const canonical = normalizeCitizenReportStatus(status);
  switch (canonical) {
    case 'resolved':
      return 'resolved';
    case 'in_progress':
      return 'in_analysis';
    case 'rejected':
      return 'awaiting_triage';
    default:
      return 'awaiting_triage';
  }
}

/**
 * Estágio operacional para KPIs e filtros da gestão urbana.
 * Diferencia triado sem envio vs em encaminhamento usando triagem formal e referrals.
 */
export function deriveUrbanWorkflowStage(input: DeriveWorkflowStageInput): ReportWorkflowStage {
  const canonical = normalizeCitizenReportStatus(input.dbStatus);
  if (canonical === 'resolved') return 'resolved';

  const hasReferral = input.hasCommissionReferral || input.hasCouncilReferral;
  if (hasReferral) return 'referred';

  if (isTriagePriority(input.formalTriagePriority)) return 'triaged';

  if (canonical === 'in_progress') return 'in_analysis';

  return 'awaiting_triage';
}
