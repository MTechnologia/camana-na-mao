import { Button } from "@/components/ui/button";

interface InlineDirectionPickerProps {
  onSelect: (direction: "ida" | "volta" | "circular", label: string) => void;
}

const OPTIONS: Array<{ value: "ida" | "volta" | "circular"; label: string }> = [
  { value: "ida", label: "Ida" },
  { value: "volta", label: "Volta" },
  { value: "circular", label: "Circular" },
];

export default function InlineDirectionPicker({ onSelect }: InlineDirectionPickerProps) {
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
