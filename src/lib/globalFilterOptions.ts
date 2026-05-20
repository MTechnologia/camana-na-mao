export const PERIOD_FILTER_OPTIONS = [
  { value: 'last_7d', label: 'Últimos 7 dias', short: '7 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias', short: '30 dias' },
  { value: 'last_90d', label: 'Últimos 90 dias', short: '90 dias' },
  { value: 'ytd', label: 'Ano corrente', short: 'Ano' },
] as const;

export const REGION_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas as regiões' },
  { value: 'central', label: 'Centro' },
  { value: 'north', label: 'Zona Norte' },
  { value: 'south', label: 'Zona Sul' },
  { value: 'east', label: 'Zona Leste' },
  { value: 'west', label: 'Zona Oeste' },
] as const;

export const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'mobilidade', label: 'Mobilidade' },
  { value: 'saude', label: 'Saúde' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'urbanismo', label: 'Urbanismo' },
  { value: 'seguranca', label: 'Segurança' },
] as const;

export function labelForPeriod(value: string): string {
  return PERIOD_FILTER_OPTIONS.find((p) => p.value === value)?.short ?? value;
}

export function labelForRegion(value: string): string {
  return REGION_FILTER_OPTIONS.find((r) => r.value === value)?.label ?? value;
}

export function labelForCategory(value: string): string {
  if (value === 'all') return 'Todas as categorias';
  const found = CATEGORY_FILTER_OPTIONS.find((c) => c.value === value);
  return found?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
}

export function globalFilterChipLabels(period: string, region: string, category: string): string[] {
  return [labelForPeriod(period), labelForRegion(region), labelForCategory(category)];
}
