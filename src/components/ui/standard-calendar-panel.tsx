import { setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildYearOptions, PT_MONTH_OPTIONS } from "@/lib/datePickerConstants";
import { cn } from "@/lib/utils";

export type StandardCalendarPanelProps = {
  displayMonth: Date;
  onDisplayMonthChange: (date: Date) => void;
  minYear?: number;
  maxYear?: number;
  panelClassName?: string;
} & Omit<CalendarProps, "month" | "onMonthChange" | "locale">;

/**
 * Painel de calendário padrão do app (NREF014): seletores de mês/ano + grade pt-BR.
 * Referência: perfil/dados-demograficos.
 */
export function StandardCalendarPanel({
  displayMonth,
  onDisplayMonthChange,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  panelClassName,
  classNames,
  className: calendarClassName,
  ...calendarProps
}: StandardCalendarPanelProps) {
  const years = buildYearOptions(minYear, maxYear);

  return (
    <div className={cn("p-3 space-y-3", panelClassName)}>
      <div className="flex gap-2">
        <Select
          value={displayMonth.getMonth().toString()}
          onValueChange={(monthValue) => {
            onDisplayMonthChange(setMonth(displayMonth, parseInt(monthValue, 10)));
          }}
        >
          <SelectTrigger className="flex-1 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60 z-[60] bg-popover">
            {PT_MONTH_OPTIONS.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={displayMonth.getFullYear().toString()}
          onValueChange={(yearValue) => {
            onDisplayMonthChange(setYear(displayMonth, parseInt(yearValue, 10)));
          }}
        >
          <SelectTrigger className="w-24 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60 z-[60] bg-popover">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Calendar
        month={displayMonth}
        onMonthChange={onDisplayMonthChange}
        locale={ptBR}
        className={cn("pointer-events-auto p-0", calendarClassName)}
        classNames={classNames}
        {...calendarProps}
      />
    </div>
  );
}
