/** Meses em português — padrão NREF014 (Dados Demográficos). */
export const PT_MONTH_OPTIONS = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
] as const;

export function buildYearOptions(minYear: number, maxYear: number): number[] {
  const from = Math.min(minYear, maxYear);
  const to = Math.max(minYear, maxYear);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i).reverse();
}

/** YYYY-MM-DD em fuso local (sem deslocar dia). */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse YYYY-MM-DD em fuso local. */
export function parseDateLocal(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Normaliza Date do DayPicker para meia-noite local. */
export function toLocalCalendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
