import type { ReportWorkflowStage } from '@/types/urbanReportManagement';
import { normalizeCitizenReportStatus } from '@/lib/citizenReportStatus';

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
