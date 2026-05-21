import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  adminBarSelectContentClass,
  adminBarSelectItemClass,
  adminBarSelectTriggerClass,
} from './adminHeaderStyles';

export type AnalyticsFilterOption = {
  value: string;
  label: string;
};

type AdminAnalyticsFilterSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly AnalyticsFilterOption[];
  className?: string;
  /** Em telas médias+, label e select na mesma linha para economizar altura. */
  compact?: boolean;
};

export function AdminAnalyticsFilterSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  className,
  compact = true,
}: AdminAnalyticsFilterSelectProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1',
        compact && 'md:min-w-[8.5rem] md:flex-row md:items-center md:gap-2',
        className,
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          'shrink-0 text-[11px] font-medium tracking-wide text-white/80',
          compact && 'md:w-[4.5rem] md:text-right',
        )}
      >
        {label}
      </label>
      <div className={cn('min-w-0', compact && 'md:flex-1')}>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger id={id} className={adminBarSelectTriggerClass} aria-label={label}>
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent className={adminBarSelectContentClass} position="popper" sideOffset={6}>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className={adminBarSelectItemClass}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
