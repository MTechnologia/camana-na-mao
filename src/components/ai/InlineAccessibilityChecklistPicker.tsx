import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ACCESSIBILITY_CHECKLIST_FIELDS = [
  { key: "elevador_funcionando", label: "Elevador funcionando" },
  { key: "piso_tatil_presente", label: "Piso tátil presente" },
  { key: "espaco_cadeirante", label: "Espaço para cadeirante" },
  { key: "info_sonora_visual_disponivel", label: "Informação sonora/visual disponível" },
] as const;

export type AccessibilityChecklistKey = (typeof ACCESSIBILITY_CHECKLIST_FIELDS)[number]["key"];
export type AccessibilityChecklistValues = Record<AccessibilityChecklistKey, boolean>;

interface InlineAccessibilityChecklistPickerProps {
  onSubmit: (values: AccessibilityChecklistValues) => void;
}

export default function InlineAccessibilityChecklistPicker({
  onSubmit,
}: InlineAccessibilityChecklistPickerProps) {
  const [values, setValues] = useState<Partial<AccessibilityChecklistValues>>({});
  const allAnswered = useMemo(
    () => ACCESSIBILITY_CHECKLIST_FIELDS.every((f) => typeof values[f.key] === "boolean"),
    [values],
  );

  return (
    <div className="mt-2 max-w-md rounded-lg border border-border/60 bg-background/40 p-3 space-y-3">
      {ACCESSIBILITY_CHECKLIST_FIELDS.map((field) => {
        const selected = values[field.key];
        return (
          <div key={field.key} className="space-y-1.5">
            <p className="text-xs text-foreground">{field.label}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={selected === true ? "default" : "outline"}
                className={cn("h-8 px-3", selected === true && "ring-1 ring-primary/30")}
                onClick={() => setValues((prev) => ({ ...prev, [field.key]: true }))}
              >
                Sim
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selected === false ? "default" : "outline"}
                className={cn("h-8 px-3", selected === false && "ring-1 ring-primary/30")}
                onClick={() => setValues((prev) => ({ ...prev, [field.key]: false }))}
              >
                Não
              </Button>
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={!allAnswered}
        onClick={() => onSubmit(values as AccessibilityChecklistValues)}
      >
        Confirmar checklist
      </Button>
    </div>
  );
}
