import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface InlineTimePickerProps {
  onSelect: (time: string, displayText: string) => void;
}

export const InlineTimePicker = ({ onSelect }: InlineTimePickerProps) => {
  const [customTime, setCustomTime] = useState("");
  const [selected, setSelected] = useState(false);

  const handleCustomSubmit = () => {
    if (!customTime) return;
    setSelected(true);
    onSelect(customTime, customTime);
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Clock className="h-3 w-3" />
        <span>Horário selecionado ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Qual foi o horário exato?</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="time"
          aria-label="Horário específico"
          value={customTime}
          onChange={(e) => setCustomTime(e.target.value)}
          className="h-9 w-[140px] text-sm"
          step={60}
          onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
        />
        <Button size="sm" variant="default" onClick={handleCustomSubmit} disabled={!customTime}>
          Confirmar horário
        </Button>
      </div>
    </div>
  );
};

export default InlineTimePicker;
