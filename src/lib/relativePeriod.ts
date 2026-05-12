/**
 * HU-8.1 — Resolução de janelas de período relativo para agendamentos.
 *
 * Cada chave representa um intervalo recalculado dinamicamente a cada
 * execução do agendamento, de forma que o relatório semanal sempre puxe
 * "os últimos 7 dias antes do disparo" — sem o gestor precisar reconfigurar.
 *
 * O cálculo é IDEMPOTENTE e PURO (recebe baseDate, retorna janela), o que
 * permite reutilizar a função tanto no client (preview na UI) quanto na
 * edge function (Deno) que dispara o job.
 */

export type RelativePeriodKind =
  | "yesterday"
  | "last_7d"
  | "last_30d"
  | "previous_month"
  | "current_month"
  | "last_quarter"
  | "last_year";

export interface ResolvedPeriod {
  /** Início do intervalo (inclusivo), em horário local (meia-noite). */
  startDate: Date;
  /** Fim do intervalo (inclusivo), em horário local (23:59:59.999). */
  endDate: Date;
}

export const RELATIVE_PERIOD_LABELS: Record<RelativePeriodKind, string> = {
  yesterday: "Ontem",
  last_7d: "Últimos 7 dias",
  last_30d: "Últimos 30 dias",
  previous_month: "Mês anterior",
  current_month: "Mês atual (parcial)",
  last_quarter: "Último trimestre",
  last_year: "Último ano",
};

export const RELATIVE_PERIOD_OPTIONS: { value: RelativePeriodKind; label: string }[] =
  (Object.keys(RELATIVE_PERIOD_LABELS) as RelativePeriodKind[]).map((k) => ({
    value: k,
    label: RELATIVE_PERIOD_LABELS[k],
  }));

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

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0);
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

/**
 * Resolve uma chave de período relativo em uma janela [startDate, endDate].
 *
 * @param kind  Chave canônica do período (validada em DB pela CHECK constraint).
 * @param baseDate Data de referência (default = agora). Útil para testes determinísticos.
 */
export function resolveRelativePeriod(
  kind: RelativePeriodKind,
  baseDate: Date = new Date(),
): ResolvedPeriod {
  switch (kind) {
    case "yesterday": {
      const y = addDays(baseDate, -1);
      return { startDate: startOfDay(y), endDate: endOfDay(y) };
    }
    case "last_7d": {
      // Últimos 7 dias completos, sem o dia atual.
      const end = endOfDay(addDays(baseDate, -1));
      const start = startOfDay(addDays(baseDate, -7));
      return { startDate: start, endDate: end };
    }
    case "last_30d": {
      const end = endOfDay(addDays(baseDate, -1));
      const start = startOfDay(addDays(baseDate, -30));
      return { startDate: start, endDate: end };
    }
    case "previous_month": {
      const prev = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
      return { startDate: startOfMonth(prev), endDate: endOfMonth(prev) };
    }
    case "current_month": {
      return { startDate: startOfMonth(baseDate), endDate: endOfDay(baseDate) };
    }
    case "last_quarter": {
      // Trimestre imediatamente anterior ao atual.
      const prev = new Date(baseDate.getFullYear(), baseDate.getMonth() - 3, 1);
      return { startDate: startOfQuarter(prev), endDate: endOfQuarter(prev) };
    }
    case "last_year": {
      const prev = new Date(baseDate.getFullYear() - 1, 0, 1);
      return { startDate: startOfYear(prev), endDate: endOfYear(prev) };
    }
  }
}

/** Converte uma janela em strings ISO sem fração de segundos. */
export function periodToIso(p: ResolvedPeriod): { startDate: string; endDate: string } {
  return {
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
  };
}

/** Helper para mostrar a janela em PT-BR (ex.: "01/05/2026 → 07/05/2026"). */
export function formatPeriodPtBr(p: ResolvedPeriod): string {
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return `${fmt(p.startDate)} → ${fmt(p.endDate)}`;
}
