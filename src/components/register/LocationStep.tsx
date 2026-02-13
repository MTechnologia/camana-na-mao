import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Check } from "lucide-react";
import CollapsibleInfoCard from "./CollapsibleInfoCard";
import { toast } from "sonner";

interface LocationData {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface LocationStepProps {
  data: LocationData;
  onChange: (field: keyof LocationData, value: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

const LocationStep = ({ data, onChange, onContinue, onSkip }: LocationStepProps) => {
  const [loading, setLoading] = useState(false);
  const [addressFound, setAddressFound] = useState(false);

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEP(value);
    onChange("cep", formatted);

    const cleanCEP = formatted.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      setLoading(true);
      setAddressFound(false);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          onChange("street", data.logradouro || "");
          onChange("neighborhood", data.bairro || "");
          onChange("city", data.localidade || "");
          onChange("state", data.uf || "");
          setAddressFound(true);
        } else {
          toast.error("CEP não encontrado");
        }
      } catch {
        toast.error("Erro ao buscar CEP");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Sua localização</h2>
        <p className="text-muted-foreground text-sm">
          Informe seu CEP para encontrarmos serviços próximos
        </p>
      </div>

      {/* Card explicativo colapsável */}
      <CollapsibleInfoCard
        icon={MapPin}
        title="Por que pedimos isso?"
        description="Com seu CEP, conseguimos mostrar UBSs, escolas e outros serviços públicos próximos de você, além de entender as demandas de cada região da cidade."
      />

      {/* CEP Input */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-2 block">
          CEP
        </Label>
        <div className="relative">
          <Input
            type="text"
            placeholder="00000-000"
            value={data.cep}
            onChange={(e) => handleCEPChange(e.target.value)}
            className="h-12 bg-muted/50 border-border rounded-xl pr-10"
            maxLength={9}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
          )}
          {addressFound && !loading && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
        </div>
      </div>

      {/* Endereço preenchido automaticamente: rua já preenchida, usuário só informa o número */}
      {addressFound && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Rua
            </Label>
            <Input
              type="text"
              value={data.street}
              onChange={(e) => onChange("street", e.target.value)}
              className="h-12 bg-muted/50 border-border rounded-xl"
              readOnly
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Número
            </Label>
            <Input
              type="text"
              placeholder="Ex.: 123, 45 A"
              value={data.number}
              onChange={(e) => onChange("number", e.target.value)}
              className="h-12 bg-muted/50 border-border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Bairro
              </Label>
              <Input
                type="text"
                value={data.neighborhood}
                onChange={(e) => onChange("neighborhood", e.target.value)}
                className="h-12 bg-muted/50 border-border rounded-xl"
                readOnly
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Cidade
              </Label>
              <Input
                type="text"
                value={data.city}
                onChange={(e) => onChange("city", e.target.value)}
                className="h-12 bg-muted/50 border-border rounded-xl"
                readOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* Botões */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onContinue}
          className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl"
        >
          Continuar
        </Button>
        <Button
          onClick={onSkip}
          variant="ghost"
          className="w-full h-10 text-muted-foreground hover:text-foreground"
        >
          Pular esta etapa
        </Button>
      </div>
    </div>
  );
};

export default LocationStep;
