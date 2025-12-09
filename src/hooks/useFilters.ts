import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { UseFiltersOptions, UseFiltersReturn, DateRangeValue } from '@/components/filters/types';
import { useDebounce } from './useDebounce';

function isDateRangeValue(value: unknown): value is DateRangeValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'from' in value &&
    'to' in value
  );
}

function isEmptyValue(value: unknown, defaultValue: unknown): boolean {
  // Handle null/undefined
  if (value === null || value === undefined) return true;
  
  // Handle empty string
  if (value === '') return true;
  
  // Handle 'all' or 'todos' as default/empty
  if (value === 'all' || value === 'todos') return true;
  
  // Handle arrays
  if (Array.isArray(value)) return value.length === 0;
  
  // Handle DateRange
  if (isDateRangeValue(value)) {
    return value.from === undefined && value.to === undefined;
  }
  
  // Check if equal to default
  if (value === defaultValue) return true;
  
  return false;
}

export function useFilters<T extends Record<string, any>>(
  options: UseFiltersOptions<T>
): UseFiltersReturn<T> {
  const { defaultValues, debounceKeys = [], debounceMs = 300, persistKey, onChange } = options;
  
  // Load from localStorage if persistKey is provided
  const getInitialState = (): T => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults to handle new fields
          return { ...defaultValues, ...parsed };
        }
      } catch (e) {
        console.warn('Failed to load filters from localStorage:', e);
      }
    }
    return defaultValues;
  };

  const [filters, setFiltersState] = useState<T>(getInitialState);
  const defaultValuesRef = useRef(defaultValues);
  
  // Create debounced version of filters
  const debouncedFilters = useDebounce(filters, debounceMs);
  
  // Persist to localStorage when filters change
  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(persistKey, JSON.stringify(filters));
      } catch (e) {
        console.warn('Failed to save filters to localStorage:', e);
      }
    }
  }, [filters, persistKey]);

  // Notify parent of changes (debounced)
  useEffect(() => {
    onChange?.(debouncedFilters);
  }, [debouncedFilters, onChange]);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilter = useCallback((key: keyof T) => {
    setFiltersState(prev => ({ ...prev, [key]: defaultValuesRef.current[key] }));
  }, []);

  const clearAll = useCallback(() => {
    setFiltersState(defaultValuesRef.current);
  }, []);

  const reset = useCallback(() => {
    setFiltersState(defaultValuesRef.current);
    if (persistKey && typeof window !== 'undefined') {
      localStorage.removeItem(persistKey);
    }
  }, [persistKey]);

  const isDefault = useCallback((key: keyof T): boolean => {
    return isEmptyValue(filters[key], defaultValuesRef.current[key]);
  }, [filters]);

  const activeCount = useMemo(() => {
    return Object.keys(filters).filter(key => {
      const k = key as keyof T;
      return !isEmptyValue(filters[k], defaultValuesRef.current[k]);
    }).length;
  }, [filters]);

  const hasActiveFilters = activeCount > 0;

  return {
    filters,
    debouncedFilters,
    setFilter,
    setFilters,
    clearFilter,
    clearAll,
    activeCount,
    hasActiveFilters,
    isDefault,
    reset,
  };
}
