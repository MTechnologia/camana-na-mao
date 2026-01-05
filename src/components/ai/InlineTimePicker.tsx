import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface InlineTimePickerProps {
  onSelect: (time: string, displayText: string) => void;
}

export const InlineTimePicker = ({ onSelect }: InlineTimePickerProps) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [selected, setSelected] = useState(false);

  const handleQuickSelect = (period: 'manha' | 'tarde' | 'noite') => {
    const timeMap = {
      manha: { time: '08:00', display: 'Manhã (6h-12h)' },
      tarde: { time: '14:00', display: 'Tarde (12h-18h)' },
      noite: { time: '19:00', display: 'Noite (18h-00h)' }
    };
    const { time, display } = timeMap[period];
    setSelected(true);
    onSelect(time, display);
  };

  const handleCustomSubmit = () => {
    const timeMatch = customTime.match(/^(\d{1,2})[h:]?(\d{2})?$/);
    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0');
      const minute = timeMatch[2] || '00';
      const formatted = `${hour}:${minute}`;
      setSelected(true);
      onSelect(formatted, formatted);
    }
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
        <span>Que horas mais ou menos?</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect('manha')}
          className="text-sm"
        >
          🌅 Manhã
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect('tarde')}
          className="text-sm"
        >
          ☀️ Tarde
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect('noite')}
          className="text-sm"
        >
          🌙 Noite
        </Button>
        {!showCustom ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCustom(true)}
            className="text-sm text-muted-foreground"
          >
            Horário específico
          </Button>
        ) : (
          <div className="flex gap-1 items-center">
            <Input
              type="text"
              placeholder="08:30"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-20 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            />
            <Button size="sm" variant="default" onClick={handleCustomSubmit}>
              OK
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineTimePicker;
