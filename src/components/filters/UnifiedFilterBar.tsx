import { Search, X, Download, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UnifiedFilterBarProps, FilterFieldConfig, DateRangeValue } from './types';
import { FilterDatePicker } from './FilterDatePicker';

export function UnifiedFilterBar<T extends Record<string, any>>({
  config,
  filters,
  onChange,
  onClearAll,
  onExport,
  activeCount = 0,
  loading = false,
  className,
}: UnifiedFilterBarProps<T>) {
  const { fields, showExport = true, showActiveCount = true, compactMode = false } = config;

  const renderField = (field: FilterFieldConfig<T>) => {
    const value = filters[field.key];
    const key = String(field.key);

    switch (field.type) {
      case 'search':
        return (
          <div className={cn('relative', field.colSpan === 2 && 'md:col-span-2')}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={field.placeholder || 'Buscar...'}
              value={(value as string) || ''}
              onChange={(e) => onChange(field.key, e.target.value as T[keyof T])}
              className="pl-9 h-9"
              disabled={loading}
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => onChange(field.key, '' as T[keyof T])}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );

      case 'select':
        return (
          <Select
            value={(value as string) || 'all'}
            onValueChange={(v) => onChange(field.key, v as T[keyof T])}
            disabled={loading}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={field.placeholder || field.label} />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">
                {field.placeholder || `Todos(as)`}
              </SelectItem>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        // For multiselect, we'd need a more complex component
        // For now, fallback to regular select
        return (
          <Select
            value={(value as string) || 'all'}
            onValueChange={(v) => onChange(field.key, v as T[keyof T])}
            disabled={loading}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={field.placeholder || field.label} />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">Todos(as)</SelectItem>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'daterange':
        return (
          <FilterDatePicker
            value={value as DateRangeValue | undefined}
            onChange={(v) => onChange(field.key, v as T[keyof T])}
            placeholder={field.placeholder || 'Período'}
          />
        );

      default:
        return null;
    }
  };

  const visibleFields = fields.filter((f) => !f.hideOnDesktop);

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl p-4',
        compactMode && 'p-3',
        className
      )}
    >
      <div
        className={cn(
          'grid gap-3',
          compactMode
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        )}
      >
        {visibleFields.map((field) => (
          <div
            key={String(field.key)}
            className={cn(
              field.colSpan === 2 && 'sm:col-span-2',
              field.colSpan === 3 && 'sm:col-span-2 lg:col-span-3'
            )}
          >
            {renderField(field)}
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end sm:col-span-full lg:col-span-1">
          {showActiveCount && activeCount > 0 && (
            <Badge variant="secondary" className="gap-1 h-7">
              <Filter className="h-3 w-3" />
              {activeCount}
            </Badge>
          )}

          {activeCount > 0 && onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="gap-1.5 text-muted-foreground hover:text-foreground h-9"
              disabled={loading}
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          )}

          {showExport && onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-1.5 h-9"
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
