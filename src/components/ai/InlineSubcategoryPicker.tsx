import { Button } from "@/components/ui/button";
import { TRANSPORT_SUBCATEGORIES } from "@/lib/reportFieldConfig";

interface InlineSubcategoryPickerProps {
  reportType: string;
  onSelect: (value: string, label: string, reportType: string) => void;
}

export default function InlineSubcategoryPicker({
  reportType,
  onSelect,
}: Readonly<InlineSubcategoryPickerProps>) {
  const options = TRANSPORT_SUBCATEGORIES[reportType] || TRANSPORT_SUBCATEGORIES.outro;

  return (
    <div className="mt-2 flex flex-col gap-2 max-w-md">
      {options.map((option) => (
        <Button
          key={`${reportType}-${option.value}`}
          type="button"
          variant="outline"
          size="sm"
          className="h-auto min-h-[40px] justify-start whitespace-normal text-left py-2 px-3"
          onClick={() => onSelect(option.value, option.label, reportType)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
