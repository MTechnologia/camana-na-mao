import { Slider } from '@/components/ui/slider';
import { severityLevels } from '@/data/transportProblems';
import { cn } from '@/lib/utils';

interface SeveritySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export const SeveritySlider = ({ value, onChange }: SeveritySliderProps) => {
  const currentLevel = severityLevels[value];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Nível de gravidade</span>
        <span className="text-sm text-muted-foreground">{currentLevel.label}</span>
      </div>

      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        max={3}
        step={1}
        className="w-full"
      />

      <div className="grid grid-cols-4 gap-2">
        {severityLevels.map((level, index) => (
          <button
            key={level.value}
            onClick={() => onChange(index)}
            className={cn(
              'p-3 rounded-lg border text-left transition-all',
              value === index
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className={cn('w-3 h-3 rounded-full mb-1', level.color)} />
            <div className="text-xs font-medium">{level.label}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              {level.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
