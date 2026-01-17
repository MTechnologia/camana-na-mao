import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parse, isValid, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EnhancedDateInputProps {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  minYear?: number;
  maxYear?: number;
}

const months = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

export function EnhancedDateInput({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  className,
  minYear = 2000,
  maxYear = 2030,
}: EnhancedDateInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [displayMonth, setDisplayMonth] = useState<Date>(value || new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate year options
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Sync input value with prop value
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
      setDisplayMonth(value);
    } else if (!value) {
      setInputValue("");
    }
  }, [value]);

  // Apply date mask: DD/MM/YYYY
  const applyMask = (rawValue: string): string => {
    // Remove non-digits
    const digits = rawValue.replace(/\D/g, "");
    
    let masked = "";
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) {
        masked += "/";
      }
      masked += digits[i];
    }
    
    return masked;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyMask(e.target.value);
    setInputValue(masked);

    // Try to parse complete date
    if (masked.length === 10) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
        setDisplayMonth(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    // Validate on blur
    if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      } else {
        // Reset to last valid value or empty
        setInputValue(value ? format(value, "dd/MM/yyyy") : "");
      }
    } else if (inputValue.length > 0 && inputValue.length < 10) {
      // Incomplete date - reset
      setInputValue(value ? format(value, "dd/MM/yyyy") : "");
    }
  };

  const handleMonthChange = (monthValue: string) => {
    const newDate = setMonth(displayMonth, parseInt(monthValue));
    setDisplayMonth(newDate);
  };

  const handleYearChange = (yearValue: string) => {
    const newDate = setYear(displayMonth, parseInt(yearValue));
    setDisplayMonth(newDate);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"));
      setDisplayMonth(date);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setInputValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <div className="flex items-center">
            <div className="relative flex-1">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(true);
                }}
                className={cn(
                  "h-11 pl-10 pr-8 rounded-xl font-normal tabular-nums",
                  !value && "text-muted-foreground"
                )}
                maxLength={10}
              />
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 z-50 bg-popover" sideOffset={4}>
        <div className="p-3 space-y-3">
          {/* Year/Month selectors */}
          <div className="flex gap-2">
            <Select
              value={displayMonth.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="flex-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60 z-[60] bg-popover">
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={displayMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
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

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            locale={ptBR}
            className="pointer-events-auto"
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default EnhancedDateInput;
