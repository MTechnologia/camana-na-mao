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
