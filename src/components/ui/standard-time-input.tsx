import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type StandardTimeInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
> & {
  containerClassName?: string;
};

/**
 * Campo de horário padronizado (NREF014) — altura e ícone alinhados ao date picker.
 */
export function StandardTimeInput({
  className,
  containerClassName,
  id,
  ...props
}: StandardTimeInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Clock
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <Input
        id={id}
        type="time"
        step={60}
        className={cn(
          "h-11 pl-10 pr-3 rounded-md font-normal tabular-nums",
          className,
        )}
        {...props}
      />
    </div>
  );
}
