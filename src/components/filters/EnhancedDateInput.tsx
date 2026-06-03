import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { StandardCalendarPanel } from "@/components/ui/standard-calendar-panel";
import { toLocalCalendarDate } from "@/lib/datePickerConstants";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface EnhancedDateInputProps {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  minYear?: number;
  maxYear?: number;
}

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

  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
      setDisplayMonth(value);
    } else if (!value) {
      setInputValue("");
    }
  }, [value]);

  const applyMask = (rawValue: string): string => {
    const digits = rawValue.replace(/\D/g, "");
    let masked = "";
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) masked += "/";
      masked += digits[i];
    }
    return masked;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyMask(e.target.value);
    setInputValue(masked);

    if (masked.length === 10) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
        setDisplayMonth(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      } else {
        setInputValue(value ? format(value, "dd/MM/yyyy") : "");
      }
    } else if (inputValue.length > 0 && inputValue.length < 10) {
      setInputValue(value ? format(value, "dd/MM/yyyy") : "");
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const local = toLocalCalendarDate(date);
      onChange(local);
      setInputValue(format(local, "dd/MM/yyyy"));
      setDisplayMonth(local);
    } else {
      onChange(undefined);
      setInputValue("");
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
                  !value && "text-muted-foreground",
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
        <StandardCalendarPanel
          displayMonth={displayMonth}
          onDisplayMonthChange={setDisplayMonth}
          minYear={minYear}
          maxYear={maxYear}
          mode="single"
          selected={value}
          onSelect={handleCalendarSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default EnhancedDateInput;
