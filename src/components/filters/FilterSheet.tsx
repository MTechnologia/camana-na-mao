import { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FilterSheetProps, FilterFieldConfig } from './types';

export function FilterSheet<T extends Record<string, unknown>>({
  config,
  filters,
  onChange,
  onApply,
  open,
  onOpenChange,
  title = 'Filtros',
  description = 'Refine sua busca',
  activeCount = 0,
}: FilterSheetProps<T>) {
  // Local state for pending changes
  const [localFilters, setLocalFilters] = useState<Partial<T>>({});

  // Sync local state when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters({ ...filters });
    }
  }, [open, filters]);

  const handleLocalChange = <K extends keyof T>(key: K, value: T[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onChange(localFilters);
    onApply?.();
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters: Partial<T> = {};
    config.fields.forEach((field) => {
      if (field.type === 'multiselect') {
        clearedFilters[field.key] = [] as T[keyof T];
      } else {
        clearedFilters[field.key] = (field.defaultValue ?? 'all') as T[keyof T];
      }
    });
    setLocalFilters(clearedFilters);
  };

  const renderField = (field: FilterFieldConfig<T>) => {
    if (field.hideOnMobile) return null;

    const value = localFilters[field.key];

    switch (field.type) {
      case 'select':
        return (
          <div key={String(field.key)} className="space-y-3">
            <Label className="text-sm font-medium">{field.label}</Label>
            <RadioGroup
              value={(value as string) || 'all'}
              onValueChange={(v) => handleLocalChange(field.key, v as T[keyof T])}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id={`${String(field.key)}-all`} />
                <Label
                  htmlFor={`${String(field.key)}-all`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Todos(as)
                </Label>
              </div>
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`${String(field.key)}-${option.value}`}
                  />
                  <Label
                    htmlFor={`${String(field.key)}-${option.value}`}
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    {typeof option.icon === 'string' && (
                      <span>{option.icon}</span>
                    )}
                    {option.label}
                    {option.count !== undefined && (
                      <span className="text-muted-foreground">({option.count})</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'multiselect': {
        const selectedValues: string[] = Array.isArray(value) ? value : [];
        return (
          <div key={String(field.key)} className="space-y-3">
            <Label className="text-sm font-medium">{field.label}</Label>
            <div className="space-y-2">
              {field.options?.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${String(field.key)}-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...selectedValues, option.value]
                          : selectedValues.filter((v: string) => v !== option.value);
                        handleLocalChange(field.key, newValues as T[keyof T]);
                      }}
                    />
                    <Label
                      htmlFor={`${String(field.key)}-${option.value}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      {typeof option.icon === 'string' && (
                        <span>{option.icon}</span>
                      )}
                      {option.label}
                      {option.count !== undefined && (
                        <span className="text-muted-foreground">({option.count})</span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'pills':
        // Pills are typically handled by QuickFilterPills, skip in sheet
        return null;

      default:
        return null;
    }
  };

  const mobileFields = config.fields.filter((f) => !f.hideOnMobile && f.type !== 'search');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <div>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </Button>
        </SheetHeader>

        <ScrollArea className="flex-1 py-6 -mx-6 px-6" style={{ height: 'calc(85vh - 160px)' }}>
          <div className="space-y-6">
            {mobileFields.map((field) => renderField(field))}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-border -mx-6 px-6">
          <Button onClick={handleApply} className="w-full gap-2">
            Aplicar filtros
            {activeCount > 0 && (
              <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
