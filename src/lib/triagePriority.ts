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

/** Mapeia textos do n8n / legado (`critica`, `urgente`, …) para P0–P3. */
export function inferPriorityFromN8n(n8n: string | null | undefined): TriagePriority | null {
  if (!n8n) return null;
  const s = normKey(n8n);
  if (!s) return null;
  if (/\bp0\b/.test(s) || s.includes('critica') || s.includes('critico') || s.includes('critical')) {
    return 'P0';
  }
  if (/\bp1\b/.test(s) || s.includes('urgente') || s.includes('alta') || s.includes('high')) {
    return 'P1';
  }
  if (
    /\bp2\b/.test(s)
    || s.includes('normal')
    || s.includes('media')
    || s.includes('moderate')
    || s.includes('medio')
  ) {
    return 'P2';
  }
  if (/\bp3\b/.test(s) || s.includes('baixa') || s.includes('low')) {
    return 'P3';
  }
  return null;
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

/** Prioridade efetiva: triagem formal → n8n → severidade do relato. */
export function effectiveReportTriagePriority(
  triagePriority: TriagePriority | null | undefined,
  n8nPriority: string | null | undefined,
  severity: string | null | undefined,
): TriagePriority | null {
  if (isTriagePriority(triagePriority)) return triagePriority;
  return inferPriorityFromN8n(n8nPriority) ?? inferPriorityFromSeverity(severity);
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
