import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Heart, Library, Dumbbell, TreePine } from "lucide-react";

interface InlineServiceTypePickerProps {
  onSelect: (type: string, displayName: string) => void;
}

const SERVICE_TYPES = [
  { id: 'ubs', label: 'UBS', icon: Heart, color: 'text-red-500' },
  { id: 'hospital', label: 'Hospital', icon: Building2, color: 'text-blue-500' },
  { id: 'school', label: 'Escola', icon: GraduationCap, color: 'text-yellow-600' },
  { id: 'ceu', label: 'CEU', icon: TreePine, color: 'text-green-500' },
  { id: 'library', label: 'Biblioteca', icon: Library, color: 'text-purple-500' },
  { id: 'sports_center', label: 'Centro Esportivo', icon: Dumbbell, color: 'text-orange-500' },
] as const;

export const InlineServiceTypePicker = ({ onSelect }: InlineServiceTypePickerProps) => {
  const [selected, setSelected] = useState(false);

  const handleSelect = (type: string, label: string) => {
    setSelected(true);
    onSelect(type, label);
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Building2 className="h-3 w-3" />
        <span>Tipo selecionado ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-xs">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3 flex-shrink-0" />
        <span>Qual tipo de serviço?</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SERVICE_TYPES.map(({ id, label, icon: Icon, color }) => (
          <Button
            key={id}
            variant="outline"
            size="sm"
            onClick={() => handleSelect(id, label)}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
            <span className="whitespace-nowrap">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default InlineServiceTypePicker;
