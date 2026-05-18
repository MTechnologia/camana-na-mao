import { Check } from "lucide-react";
import { passwordRequirements } from "@/lib/validations";
import { cn } from "@/lib/utils";

interface PasswordRequirementsChecklistProps {
  password: string;
  className?: string;
  title?: string;
}

/**
 * Lista de requisitos de senha (paridade com o passo 2 do cadastro).
 */
export function PasswordRequirementsChecklist({
  password,
  className,
  title = "A senha deve conter:",
}: PasswordRequirementsChecklistProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-muted/30 p-3", className)}>
      <p className="text-xs font-medium text-foreground mb-2">{title}</p>
      <ul className="space-y-1">
        {passwordRequirements.map((requirement) => {
          const isMet = requirement.test(password);
          return (
            <li
              key={requirement.id}
              className={cn(
                "flex items-center gap-2 text-xs",
                isMet ? "text-green-700" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border",
                  isMet
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-muted-foreground/40",
                )}
              >
                {isMet && <Check size={12} strokeWidth={3} />}
              </span>
              {requirement.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
