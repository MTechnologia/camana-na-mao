import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Heart, Library, Dumbbell, TreePine, ShoppingBag } from "lucide-react";

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
  { id: 'street_market', label: 'Feira', icon: ShoppingBag, color: 'text-amber-600' },
  { id: 'community_center', label: 'Centro Comunitário', icon: Building2, color: 'text-teal-600' },
  { id: 'daycare', label: 'Creche', icon: GraduationCap, color: 'text-pink-500' },
  { id: 'park', label: 'Parque', icon: TreePine, color: 'text-green-600' },
  { id: 'social_assistance', label: 'Assistência Social', icon: Heart, color: 'text-rose-600' },
  { id: 'police_station', label: 'Delegacia', icon: Building2, color: 'text-slate-600' },
  { id: 'transit_station', label: 'Transporte', icon: Building2, color: 'text-indigo-600' },
  { id: 'market', label: 'Mercado', icon: ShoppingBag, color: 'text-amber-700' },
  { id: 'theater', label: 'Teatro/Cinema', icon: Building2, color: 'text-violet-600' },
  { id: 'museum', label: 'Museu', icon: Building2, color: 'text-stone-600' },
  { id: 'cemetery', label: 'Cemitério', icon: Building2, color: 'text-gray-600' },
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
