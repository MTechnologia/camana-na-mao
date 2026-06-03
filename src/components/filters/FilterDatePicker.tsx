import { useState } from "react";
import { subDays, subMonths, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StandardCalendarPanel } from "@/components/ui/standard-calendar-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterDatePickerProps, DateRangeValue } from "./types";
import { formatShortDate, formatCompactDate } from "@/lib/dateUtils";

const defaultPresets: { label: string; getValue: () => DateRangeValue }[] = [
  {
    label: "Últimos 7 dias",
    getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: "Últimos 30 dias",
    getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: "Últimos 3 meses",
    getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
  },
  {
    label: "Este ano",
    getValue: () => ({ from: startOfYear(new Date()), to: new Date() }),
  },
];

export function FilterDatePicker({
  value,
  onChange,
  placeholder = "Selecionar período",
  showPresets = true,
  className,
}: FilterDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(value?.from ?? new Date());

  const hasValue = value?.from || value?.to;

  const formatDateRange = () => {
    if (!value?.from) return placeholder;
    if (!value?.to) return formatShortDate(value.from);
    return `${formatCompactDate(value.from)} - ${formatCompactDate(value.to)}`;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal gap-2 h-9",
            !hasValue && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatDateRange()}</span>
          {hasValue && (
            <X
              className="h-3 w-3 shrink-0 opacity-50 hover:opacity-100 ml-auto"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
        <div className="flex">
          {showPresets && (
            <div className="border-r border-border p-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Atalhos</p>
              {defaultPresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-7"
                  onClick={() => {
                    const next = preset.getValue();
                    onChange(next);
                    if (next.from) setDisplayMonth(next.from);
                    setOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <StandardCalendarPanel
            displayMonth={displayMonth}
            onDisplayMonthChange={setDisplayMonth}
            minYear={2000}
            maxYear={new Date().getFullYear() + 1}
            mode="range"
            selected={value ? { from: value.from, to: value.to } : undefined}
            onSelect={(range) => {
              onChange(range ? { from: range.from, to: range.to } : undefined);
              if (range?.from) setDisplayMonth(range.from);
              if (range?.from && range?.to) {
                setOpen(false);
              }
            }}
            numberOfMonths={1}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
