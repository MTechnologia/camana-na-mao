import { Button } from "@/components/ui/button";

interface InlineRecurrenceFrequencyPickerProps {
  onSelect: (
    frequency: "primeira_vez" | "algumas_vezes_mes" | "toda_semana" | "todos_os_dias",
    label: string,
  ) => void;
}

const OPTIONS: Array<{
  value: "primeira_vez" | "algumas_vezes_mes" | "toda_semana" | "todos_os_dias";
  label: string;
}> = [
  { value: "primeira_vez", label: "Primeira vez" },
  { value: "algumas_vezes_mes", label: "Algumas vezes/mês" },
  { value: "toda_semana", label: "Toda semana" },
  { value: "todos_os_dias", label: "Todos os dias" },
];

export default function InlineRecurrenceFrequencyPicker({
  onSelect,
}: InlineRecurrenceFrequencyPickerProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect(option.value, option.label)}
          className="min-h-[36px]"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
