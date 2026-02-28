import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// Tipos de campo suportados
export type FilterFieldType = 'select' | 'multiselect' | 'daterange' | 'search' | 'pills';

// Opção de filtro
export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode | LucideIcon;
  count?: number;
}

// Definição de um campo de filtro
export interface FilterFieldConfig<T> {
  key: keyof T;
  type: FilterFieldType;
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: T[keyof T];
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  colSpan?: 1 | 2 | 3;
}

// Configuração completa de filtros
export interface FilterConfig<T extends Record<string, unknown>> {
  fields: FilterFieldConfig<T>[];
  debounceMs?: number;
  persistKey?: string;
  showExport?: boolean;
  showActiveCount?: boolean;
  compactMode?: boolean;
}

// Date range type
export interface DateRangeValue {
  from: Date | undefined;
  to: Date | undefined;
}

// Estado do hook
export interface UseFiltersOptions<T> {
  defaultValues: T;
  debounceKeys?: (keyof T)[];
  debounceMs?: number;
  persistKey?: string;
  onChange?: (filters: T) => void;
}

export interface UseFiltersReturn<T> {
  filters: T;
  debouncedFilters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (filters: Partial<T>) => void;
  clearFilter: (key: keyof T) => void;
  clearAll: () => void;
  activeCount: number;
  hasActiveFilters: boolean;
  isDefault: (key: keyof T) => boolean;
  reset: () => void;
}

// Props dos componentes
export interface UnifiedFilterBarProps<T extends Record<string, unknown>> {
  config: FilterConfig<T>;
  filters: T;
  onChange: <K extends keyof T>(key: K, value: T[K]) => void;
  onClearAll?: () => void;
  onExport?: () => void;
  activeCount?: number;
  loading?: boolean;
  className?: string;
}

export interface FilterSheetProps<T extends Record<string, unknown>> {
  config: FilterConfig<T>;
  filters: T;
  onChange: (filters: Partial<T>) => void;
  onApply?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  activeCount?: number;
}

export interface QuickFilterPillsProps {
  options: FilterOption[];
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  mode?: 'single' | 'multi';
  showAllOption?: boolean;
  allLabel?: string;
  allValue?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export interface FilterDatePickerProps {
  value: DateRangeValue | undefined;
  onChange: (value: DateRangeValue | undefined) => void;
  placeholder?: string;
  presets?: { label: string; value: DateRangeValue }[];
  showPresets?: boolean;
  className?: string;
}
