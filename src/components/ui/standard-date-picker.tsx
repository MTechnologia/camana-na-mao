import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StandardCalendarPanel } from "@/components/ui/standard-calendar-panel";
import { toLocalCalendarDate } from "@/lib/datePickerConstants";
import { cn } from "@/lib/utils";
import type { Matcher } from "react-day-picker";

export type StandardDatePickerProps = {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: Matcher | Matcher[];
  minYear?: number;
  maxYear?: number;
  className?: string;
  triggerClassName?: string;
  closeOnSelect?: boolean;
  id?: string;
};

/**
 * Campo de data única com popover — padrão NREF014 (referência: Data de Nascimento).
 */
export function StandardDatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  className,
  triggerClassName,
  closeOnSelect = true,
  id,
}: StandardDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(value ?? new Date());

  useEffect(() => {
    if (value) setDisplayMonth(value);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full h-11 justify-start text-left font-normal",
            !value && "text-muted-foreground",
            triggerClassName,
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? format(value, "PPP", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
        <StandardCalendarPanel
          displayMonth={displayMonth}
          onDisplayMonthChange={setDisplayMonth}
          minYear={minYear}
          maxYear={maxYear}
          mode="single"
          selected={value}
          disabled={disabled}
          initialFocus
          onSelect={(date) => {
            if (date) {
              const local = toLocalCalendarDate(date);
              onChange(local);
              setDisplayMonth(local);
              if (closeOnSelect) setOpen(false);
            } else {
              onChange(undefined);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
