import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OperationalStatusFilterValue = "all" | "open" | "closed" | "maintenance";

interface OperationalStatusFilterChipsProps {
  value: OperationalStatusFilterValue;
  onChange: (value: OperationalStatusFilterValue) => void;
  label?: string;
  compact?: boolean;
}

export function OperationalStatusFilterChips({
  value,
  onChange,
  label = "Status operacional:",
  compact = false,
}: OperationalStatusFilterChipsProps) {
  const labelClass = compact ? "text-xs" : "text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn(labelClass, "text-muted-foreground shrink-0")}>{label}</span>
      <Badge
        variant={value === "all" ? "default" : "outline"}
        className={cn(
          "cursor-pointer whitespace-nowrap transition-all",
          value === "all" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
        )}
        onClick={() => onChange("all")}
      >
        Todos
      </Badge>
      <Badge
        variant={value === "open" ? "default" : "outline"}
        className={cn(
          "cursor-pointer whitespace-nowrap transition-all",
          value === "open"
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
        )}
        onClick={() => onChange("open")}
      >
        Aberto
      </Badge>
      <Badge
        variant={value === "closed" ? "default" : "outline"}
        className={cn(
          "cursor-pointer whitespace-nowrap transition-all",
          value === "closed"
            ? "bg-rose-600 text-white hover:bg-rose-700"
            : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
        )}
        onClick={() => onChange("closed")}
      >
        Fechado
      </Badge>
      <Badge
        variant={value === "maintenance" ? "default" : "outline"}
        className={cn(
          "cursor-pointer whitespace-nowrap transition-all",
          value === "maintenance"
            ? "bg-amber-500 text-black hover:bg-amber-400"
            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
        )}
        onClick={() => onChange("maintenance")}
      >
        Em manutenção
      </Badge>
    </div>
  );
}

