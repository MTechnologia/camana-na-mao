import { Button } from "@/components/ui/button";

export const TRANSPORT_IMPACT_OPTIONS = [
  { score: 5, label: "Perdi compromisso" },
  { score: 4, label: "Atraso maior que 30 min" },
  { score: 3, label: "Atraso menor que 30 min" },
  { score: 2, label: "Desconforto" },
  { score: 5, label: "Não consegui embarcar" },
] as const;

interface InlineImpactPickerProps {
  onSelect: (score: number, label: string) => void;
}

export default function InlineImpactPicker({ onSelect }: InlineImpactPickerProps) {
  return (
    <div className="mt-2 flex flex-col gap-2 max-w-md">
      {TRANSPORT_IMPACT_OPTIONS.map((option, i) => (
        <Button
          key={`${option.label}-${i}`}
          type="button"
          variant="outline"
          size="sm"
          className="h-auto min-h-[40px] justify-start whitespace-normal text-left py-2 px-3"
          onClick={() => onSelect(option.score, option.label)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
