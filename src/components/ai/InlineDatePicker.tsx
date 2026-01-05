import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InlineDatePickerProps {
  onSelect: (date: string, displayText: string) => void;
}

export const InlineDatePicker = ({ onSelect }: InlineDatePickerProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selected, setSelected] = useState(false);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const handleQuickSelect = (option: 'hoje' | 'ontem') => {
    const date = option === 'hoje' ? today : yesterday;
    const isoDate = date.toISOString().split('T')[0];
    const displayText = option === 'hoje' ? 'Hoje' : 'Ontem';
    setSelected(true);
    onSelect(isoDate, displayText);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const isoDate = date.toISOString().split('T')[0];
      const displayText = format(date, "dd/MM/yyyy", { locale: ptBR });
      setSelected(true);
      setShowCalendar(false);
      onSelect(isoDate, displayText);
    }
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Calendar className="h-3 w-3" />
        <span>Data selecionada ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>Quando aconteceu?</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect('hoje')}
          className="text-sm"
        >
          Hoje
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect('ontem')}
          className="text-sm"
        >
          Ontem
        </Button>
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              Outro dia
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={undefined}
              onSelect={handleCalendarSelect}
              locale={ptBR}
              disabled={(date) => date > today}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default InlineDatePicker;
