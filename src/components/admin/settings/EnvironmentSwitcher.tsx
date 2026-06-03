import type { ConfigEnvironment } from "@/types/systemConfig";
import { useConfigEnvironment } from "@/contexts/ConfigEnvironmentContext";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const options: { value: ConfigEnvironment; label: string }[] = [
  { value: "production", label: "Produção" },
  { value: "homologation", label: "Homologação" },
];

export function EnvironmentSwitcher({ className }: { className?: string }) {
  const { environment, setEnvironment } = useConfigEnvironment();

  return (
    <div className={cn("flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3", className)}>
      <Label className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
        Ambiente
      </Label>
      <div
        className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5"
        role="group"
        aria-label="Selecionar ambiente de configuração"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setEnvironment(opt.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              environment === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={environment === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
