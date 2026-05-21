import { describe, expect, it } from 'vitest';
import {
  DRILL_THROUGH_PAGE_SIZE,
  drillThroughTotalPages,
  paginateDrillThroughReports,
} from '@/lib/fetchDrillThroughReports';
import type { DrillReportRow } from '@/types/analyticsDrill';

function row(id: string): DrillReportRow {
  return {
    id,
    title: `Relato ${id}`,
    status: 'Pendente',
    createdAt: '01/01/2026',
    source: 'urban',
  };
}

describe('fetchDrillThroughReports pagination', () => {
  it('pagina 20 itens por página', () => {
    const reports = Array.from({ length: 72 }, (_, i) => row(String(i)));
    expect(paginateDrillThroughReports(reports, 1)).toHaveLength(DRILL_THROUGH_PAGE_SIZE);
    expect(paginateDrillThroughReports(reports, 2)).toHaveLength(DRILL_THROUGH_PAGE_SIZE);
    expect(paginateDrillThroughReports(reports, 4)).toHaveLength(12);
    expect(drillThroughTotalPages(72)).toBe(4);
  });
});
