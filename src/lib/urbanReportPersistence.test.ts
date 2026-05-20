import { describe, expect, it } from 'vitest';
import { dbStatusToWorkflowStage, stageToDbStatus } from '@/lib/urbanReportPersistence';

describe('urbanReportPersistence', () => {
  it('stageToDbStatus mapeia concluído para resolved', () => {
    expect(stageToDbStatus('resolved')).toBe('resolved');
    expect(stageToDbStatus('in_analysis')).toBe('in_progress');
    expect(stageToDbStatus('triaged')).toBe('in_progress');
  });

  it('dbStatusToWorkflowStage normaliza sinônimos', () => {
    expect(dbStatusToWorkflowStage('resolvido')).toBe('resolved');
    expect(dbStatusToWorkflowStage('in_progress')).toBe('in_analysis');
    expect(dbStatusToWorkflowStage('pending')).toBe('awaiting_triage');
  });
});
