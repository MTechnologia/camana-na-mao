import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Building2, MoreHorizontal } from "lucide-react";

export interface InlineServiceTypePickerProps {
  onSelect: (type: string, displayName: string, otherSpec?: string) => void;
}

/** Principais (alinhado ao "Perto de você" e OS05): UBS, Escolas, CEUs, Hospitais, Bibliotecas, Esportes */
const MAIN_TYPES = [
  { id: "ubs", label: "UBS", icon: "🏥" },
  { id: "school", label: "Escolas", icon: "🏫" },
  { id: "ceu", label: "CEUs", icon: "🎭" },
  { id: "hospital", label: "Hospitais", icon: "🏥" },
  { id: "library", label: "Bibliotecas", icon: "📚" },
  { id: "sports_center", label: "Esportes", icon: "⚽" },
] as const;

/** Demais tipos (exibidos em "Outros tipos" expansível) */
const OTHER_TYPES = [
  { id: "street_market", label: "Feiras", icon: "🛒" },
  { id: "community_center", label: "Centros Comunitários", icon: "🏘️" },
  { id: "daycare", label: "Creches", icon: "🍼" },
  { id: "park", label: "Parques", icon: "🌳" },
  { id: "market", label: "Mercados", icon: "🛒" },
  { id: "city_market", label: "Mercados Municipais", icon: "🏪" },
  { id: "theater", label: "Teatro/Cinema", icon: "🎬" },
  { id: "museum", label: "Museus", icon: "🏛️" },
  { id: "social_assistance", label: "Assistência Social", icon: "🤝" },
  { id: "transit_station", label: "Transporte", icon: "🚌" },
  { id: "police_station", label: "Delegacia/Polícia", icon: "🚔" },
  { id: "cemetery", label: "Cemitério", icon: "🪦" },
  { id: "accessibility", label: "Acessibilidade", icon: "♿" },
  { id: "recycling_point", label: "Reciclagem/Limpeza", icon: "♻️" },
  { id: "fire_station", label: "Bombeiros", icon: "🚒" },
] as const;

export const InlineServiceTypePicker = ({ onSelect }: InlineServiceTypePickerProps) => {
  const [selected, setSelected] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherSpec, setOtherSpec] = useState("");
  const [openOutrosTipos, setOpenOutrosTipos] = useState(false);

  const handleSelect = (type: string, label: string, spec?: string) => {
    setSelected(true);
    onSelect(type, label, spec);
  };

  const handleOtherConfirm = () => {
    handleSelect("other", "Outros", otherSpec.trim() || undefined);
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
    <div className="mt-3 w-full max-w-md space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">
        Filtrar por tipo (igual ao Perto de você)
      </p>

      {/* Principais */}
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Principais</p>
        <div className="flex flex-wrap gap-2">
          {MAIN_TYPES.map(({ id, label, icon }) => (
            <Button
              key={id}
              variant="default"
              size="sm"
              onClick={() => handleSelect(id, label)}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <span aria-hidden>{icon}</span>
              <span className="whitespace-nowrap">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Outros tipos (expansível) */}
      <Collapsible open={openOutrosTipos} onOpenChange={setOpenOutrosTipos}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {openOutrosTipos ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Outros tipos
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-wrap gap-2 pt-1">
            {OTHER_TYPES.map(({ id, label, icon }) => (
              <Button
                key={id}
                variant="outline"
                size="sm"
                onClick={() => handleSelect(id, label)}
                className="flex items-center gap-1.5 flex-shrink-0"
              >
                <span aria-hidden>{icon}</span>
                <span className="whitespace-nowrap">{label}</span>
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Campo "Outros" */}
      <div className="space-y-1.5 border-t border-border/50 pt-2">
        {!showOtherInput ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOtherInput(true)}
            className="gap-1.5 text-muted-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
            Outros (especificar)
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Ex.: posto de saúde, centro cultural..."
              value={otherSpec}
              onChange={(e) => setOtherSpec(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOtherConfirm();
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleOtherConfirm} className="flex-1">
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowOtherInput(false);
                  setOtherSpec("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineServiceTypePicker;
