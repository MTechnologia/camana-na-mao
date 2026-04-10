import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** RN-EVAL-001: faixa → nota (null = Não se aplica). */
export const WAIT_TIME_OPTIONS: ReadonlyArray<{
  label: string;
  score: number | null;
}> = [
  { label: "Menos de 15 minutos", score: 5 },
  { label: "De 15 a 30 minutos", score: 4 },
  { label: "De 30 a 60 minutos", score: 3 },
  { label: "Mais de 1 hora", score: 2 },
  { label: "Não se aplica", score: null },
];

export interface WaitTimePickerProps {
  onSelect: (displayLabel: string, score: number | null) => void;
}

/** Botões inline para tempo de espera; mensagem enviada pelo hook com [WAIT_TIME:N] ou [WAIT_TIME:null]. */
export function WaitTimePicker({ onSelect }: WaitTimePickerProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const handleClick = (label: string, score: number | null) => {
    setSelectedLabel(label);
    onSelect(label, score);
  };

  if (selectedLabel !== null) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Clock className="h-3 w-3 shrink-0" />
        <span className="line-clamp-2">{selectedLabel} ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-md">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        <span>Toque na opção que melhor descreve o tempo de espera:</span>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Tempo de espera para atendimento"
      >
        {WAIT_TIME_OPTIONS.map(({ label, score }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "min-h-[40px] flex-1 min-w-[140px] sm:min-w-[160px] justify-center text-center text-xs leading-snug px-2 whitespace-normal h-auto py-2"
            )}
            onClick={() => handleClick(label, score)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default WaitTimePicker;
