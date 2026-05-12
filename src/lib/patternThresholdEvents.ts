import type { PatternAlert } from '@/components/analytics/PatternAlerts';
import type { Tables } from '@/integrations/supabase/types';

export type ReportPatternThresholdEventRow = Tables<'report_pattern_threshold_events'>;

function formatPatternType(patternType: string): string {
  return patternType.replace(/_/g, ' ').trim();
}

function getAlertType(event: ReportPatternThresholdEventRow): PatternAlert['type'] {
  const normalized = event.pattern_type.toLowerCase();

  if (normalized.includes('hora') || normalized.includes('peak')) return 'time';
  if (normalized.includes('bairro') || normalized.includes('regiao') || normalized.includes('região')) {
    return 'location';
  }
  if (
    event.alert_level === 'critical' ||
    event.average_severity === 'critical' ||
    event.average_severity === 'high'
  ) {
    return 'severity';
  }

  return 'frequency';
}

function buildSuggestedAction(event: ReportPatternThresholdEventRow): string {
  if (event.alert_level === 'critical') {
    return 'Priorizar investigação operacional e encaminhamento imediato.';
  }

  if ((event.occurrence_count ?? 0) >= 15) {
    return 'Monitorar recorrência e validar se a linha precisa de ação preventiva.';
  }

  return 'Acompanhar a evolução do padrão na próxima janela de análise.';
}

export function mapThresholdEventToPatternAlert(
  event: ReportPatternThresholdEventRow
): PatternAlert {
  const patternLabel = formatPatternType(event.pattern_type);
  const title =
    event.alert_level === 'critical'
      ? `Padrão crítico: ${patternLabel}`
      : `Padrão recorrente: ${patternLabel}`;

  return {
    id: event.id,
    type: getAlertType(event),
    severity: event.alert_level === 'critical' ? 'critical' : 'warning',
    title,
    description:
      event.description ||
      `${event.occurrence_count ?? 0} ocorrências detectadas para ${patternLabel} na janela atual.`,
    suggestedAction: buildSuggestedAction(event),
    count: event.occurrence_count ?? undefined,
  };
}

export function sortThresholdEventAlerts(alerts: PatternAlert[]): PatternAlert[] {
  return [...alerts].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return (b.count ?? 0) - (a.count ?? 0);
  });
}

export function mapThresholdEventsToPatternAlerts(
  events: ReportPatternThresholdEventRow[]
): PatternAlert[] {
  return sortThresholdEventAlerts(events.map(mapThresholdEventToPatternAlert));
}
