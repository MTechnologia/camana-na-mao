import { Label } from '@/components/ui/label';
import {
  dateToInputValue,
  inputValueToDate,
  normalizeDateRange,
} from '@/lib/dateRangeUtils';
import type { DateRangeValue } from '@/components/filters/types';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

type FilterDateRangeFieldsProps = {
  value: DateRangeValue | undefined;
  onChange: (value: DateRangeValue | undefined) => void;
  fromId?: string;
  toId?: string;
  className?: string;
  inputClassName?: string;
};

export function FilterDateRangeFields({
  value,
  onChange,
  fromId = 'date-range-from',
  toId = 'date-range-to',
  className,
  inputClassName,
}: FilterDateRangeFieldsProps) {
  const fromStr = dateToInputValue(value?.from);
  const toStr = dateToInputValue(value?.to);
  const fieldClass = cn(inputClass, inputClassName);

  const patch = (from?: Date, to?: Date) => {
    onChange(normalizeDateRange(from ?? value?.from, to ?? value?.to));
  };

  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
      <div className="space-y-1">
        <Label htmlFor={fromId} className="text-xs text-muted-foreground">
          Data inicial
        </Label>
        <input
          id={fromId}
          type="date"
          className={fieldClass}
          value={fromStr}
          max={toStr || undefined}
          onChange={(e) => patch(inputValueToDate(e.target.value), value?.to)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={toId} className="text-xs text-muted-foreground">
          Data final
        </Label>
        <input
          id={toId}
          type="date"
          className={fieldClass}
          value={toStr}
          min={fromStr || undefined}
          onChange={(e) => patch(value?.from, inputValueToDate(e.target.value))}
        />
      </div>
    </div>
  );
}
