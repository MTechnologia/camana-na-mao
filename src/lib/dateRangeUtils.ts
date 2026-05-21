import type { DateRangeValue } from '@/components/filters/types';

/** yyyy-MM-dd para input[type=date]. */
export function dateToInputValue(d: Date | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Converte valor do input nativo em Date (meio-dia local, evita troca de dia por TZ). */
export function inputValueToDate(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, day] = s.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !day) return undefined;
  const d = new Date(y, m - 1, day, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function isCompleteDateRange(
  range: DateRangeValue | null | undefined,
): range is { from: Date; to: Date } {
  return Boolean(range?.from && range?.to);
}

/** Ordena from/to e normaliza início/fim do dia. */
export function normalizeDateRange(
  from?: Date,
  to?: Date,
): DateRangeValue | undefined {
  if (!from && !to) return undefined;
  if (from && !to) return { from: startOfDay(from), to: undefined };
  if (!from && to) return { from: undefined, to: endOfDay(to) };

  let start = startOfDay(from!);
  let end = endOfDay(to!);
  if (end.getTime() < start.getTime()) {
    const tmp = start;
    start = startOfDay(to!);
    end = endOfDay(from!);
  }
  return { from: start, to: end };
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
