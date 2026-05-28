import { supabase } from '@/integrations/supabase/client';
import type { TriagePriority } from '@/lib/triage';

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normKey(s: string): string {
  return stripDiacritics(s.toLowerCase().trim());
}

export function isTriagePriority(v: unknown): v is TriagePriority {
  return v === 'P0' || v === 'P1' || v === 'P2' || v === 'P3';
}

export function inferPriorityFromSeverity(sev: string | null | undefined): TriagePriority | null {
  if (!sev) return null;
  const s = normKey(sev);
  if (!s) return null;
  if (s.includes('crit')) return 'P0';
  if (s.includes('alto') || s.includes('high') || s === 'alta') return 'P1';
  if (s.includes('med') || s.includes('moder')) return 'P2';
  if (s.includes('baix') || s.includes('low')) return 'P3';
  return null;
}

/** Prioridade efetiva: triagem formal ou severidade do relato. */
export function effectiveReportTriagePriority(
  triagePriority: TriagePriority | null | undefined,
  severity: string | null | undefined,
): TriagePriority | null {
  if (isTriagePriority(triagePriority)) return triagePriority;
  return inferPriorityFromSeverity(severity);
}

/** Prioridades formais em `report_triage` por relato urbano. */
export async function loadUrbanTriagePriorityByReportId(
  reportIds: string[],
): Promise<Map<string, TriagePriority | null>> {
  const map = new Map<string, TriagePriority | null>();
  if (reportIds.length === 0) return map;

  const { data, error } = await supabase
    .from('report_triage')
    .select('report_id, priority')
    .eq('source_table', 'urban_reports')
    .in('report_id', reportIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const p = row.priority;
    map.set(row.report_id, isTriagePriority(p) ? p : null);
  }
  return map;
}
