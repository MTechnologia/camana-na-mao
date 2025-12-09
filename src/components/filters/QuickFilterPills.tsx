import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { QuickFilterPillsProps } from './types';

export function QuickFilterPills({
  options,
  selected,
  onChange,
  mode = 'single',
  showAllOption = true,
  allLabel = 'Todos',
  allValue = 'all',
  size = 'default',
  className,
}: QuickFilterPillsProps) {
  const isSelected = (value: string): boolean => {
    if (mode === 'single') {
      return selected === value || (value === allValue && (!selected || selected === allValue));
    }
    return Array.isArray(selected) && selected.includes(value);
  };

  const handleClick = (value: string) => {
    if (mode === 'single') {
      onChange(value);
    } else {
      const currentSelected = Array.isArray(selected) ? selected : [];
      
      // Handle "all" option
      if (value === allValue) {
        onChange([]);
        return;
      }

      const isCurrentlySelected = currentSelected.includes(value);
      const newSelected = isCurrentlySelected
        ? currentSelected.filter((v) => v !== value)
        : [...currentSelected, value];
      
      onChange(newSelected);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 h-6',
    default: 'text-sm px-3 py-1 h-8',
    lg: 'text-base px-4 py-1.5 h-10',
  };

  const allOptions = showAllOption
    ? [{ value: allValue, label: allLabel }, ...options]
    : options;

  // Check if "all" should be shown as selected (no specific selection)
  const isAllSelected = mode === 'multi' 
    ? !Array.isArray(selected) || selected.length === 0
    : selected === allValue || !selected;

  return (
    <ScrollArea className={cn('w-full whitespace-nowrap', className)}>
      <div className="flex gap-2 pb-2">
        {allOptions.map((option) => {
          const active = option.value === allValue ? isAllSelected : isSelected(option.value);
          
          return (
            <Badge
              key={option.value}
              variant={active ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all hover:scale-105 shrink-0',
                sizeClasses[size],
                active
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-transparent hover:bg-muted text-foreground border-border'
              )}
              onClick={() => handleClick(option.value)}
            >
              {typeof option.icon === 'string' && (
                <span className="mr-1">{option.icon}</span>
              )}
              {typeof option.icon === 'object' && option.icon !== null && (
                <span className="mr-1 h-4 w-4">{option.icon}</span>
              )}
              {option.label}
              {option.count !== undefined && (
                <span className={cn(
                  'ml-1.5 text-xs',
                  active ? 'opacity-80' : 'text-muted-foreground'
                )}>
                  {option.count}
                </span>
              )}
            </Badge>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="h-1.5" />
    </ScrollArea>
  );
}
