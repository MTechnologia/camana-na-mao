import type { ReportPriority, ReportWorkflowStage, UrbanReportRecord } from '@/types/urbanReportManagement';

export const STAGE_LABELS: Record<ReportWorkflowStage, string> = {
  awaiting_triage: 'Aguardando triagem',
  triaged: 'Triado',
  referred: 'Encaminhado',
  in_analysis: 'Em análise',
  resolved: 'Concluído',
};

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
};

export function countByStage(reports: UrbanReportRecord[]) {
  return {
    awaiting_triage: reports.filter((r) => r.stage === 'awaiting_triage').length,
    triaged: reports.filter((r) => r.stage === 'triaged').length,
    referred: reports.filter((r) => r.stage === 'referred').length,
    in_analysis: reports.filter((r) => r.stage === 'in_analysis').length,
    resolved: reports.filter((r) => r.stage === 'resolved').length,
    open: reports.filter((r) => r.stage !== 'resolved').length,
  };
}
