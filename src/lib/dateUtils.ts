import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data no padrão dd/MM/yyyy
 */
export const formatShortDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

/**
 * Formata data no padrão dd/MM/yy
 */
export const formatCompactDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yy', { locale: ptBR });
};

/**
 * Formata data no padrão dd/MM
 */
export const formatDayMonth = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM', { locale: ptBR });
};

/**
 * Formata data por extenso: "25 de dezembro de 2024"
 */
export const formatLongDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

/**
 * Formata data e hora: "25/12/2024 às 14:30"
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

/**
 * Formata data por extenso com hora: "25 de dezembro às 14:30"
 */
export const formatLongDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
};

/**
 * Formata data curta com hora: "25/12 14:30"
 */
export const formatCompactDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd/MM HH:mm", { locale: ptBR });
};

/**
 * Formata tempo relativo: "há 5 minutos", "há 2 horas"
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
};

/**
 * Formata tempo relativo sem prefixo: "5 minutos", "2 horas"
 */
export const formatRelativeTimeShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { locale: ptBR });
};

/**
 * HU-5.2 — Converte "YYYY-MM-DD" em um Date à meia-noite LOCAL.
 *
 * `new Date("2026-05-11")` interpreta a string como UTC midnight, o que em
 * timezones negativos (ex.: -03:00) vira o dia anterior no horário local.
 * Esta função evita o bug parseando os componentes Y/M/D explicitamente.
 *
 * Aceita também strings ISO completas (extrai apenas a parte yyyy-MM-dd).
 */
export const parseLocalDate = (s: string | null | undefined): Date | undefined => {
  if (!s) return undefined;
  const datePart = s.length >= 10 ? s.slice(0, 10) : s;
  const parts = datePart.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [y, m, d] = parts;
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d); // meia-noite local
};

/**
 * HU-5.2 — Formata um Date como "YYYY-MM-DD" usando os componentes LOCAIS.
 *
 * Diferente de `date.toISOString().slice(0, 10)`, que converte primeiro para
 * UTC e pode pular o dia em timezones negativos.
 */
export const formatLocalDate = (d: Date | null | undefined): string | undefined => {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
