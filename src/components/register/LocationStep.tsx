import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Check, AlertTriangle } from "lucide-react";
import CollapsibleInfoCard from "./CollapsibleInfoCard";
import { toast } from "sonner";
import { lookupCepAddress } from "@/lib/cepLookup";

interface LocationData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface LocationStepProps {
  data: LocationData;
  onChange: (field: keyof LocationData, value: string) => void;
  onContinue: () => void;
}

const LocationStep = ({ data, onChange, onContinue }: LocationStepProps) => {
  const [loading, setLoading] = useState(false);
  const [addressFound, setAddressFound] = useState(false);
  const [cepLookupError, setCepLookupError] = useState<"not_found" | "service_unavailable" | null>(
    null,
  );

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEP(value);
    onChange("cep", formatted);

    const cleanCEP = formatted.replace(/\D/g, "");
    if (cleanCEP.length < 8) {
      setAddressFound(false);
      setCepLookupError(null);
      return;
    }

    if (cleanCEP.length === 8) {
      setLoading(true);
      setAddressFound(false);
      setCepLookupError(null);
      onChange("street", "");
      onChange("neighborhood", "");
      onChange("city", "");
      onChange("state", "");
      try {
        const result = await lookupCepAddress(cleanCEP);
        if (result.ok) {
          onChange("cep", formatCEP(result.address.cep || cleanCEP));
          onChange("street", result.address.street || "");
          onChange("neighborhood", result.address.neighborhood || "");
          onChange("city", result.address.city || "");
          onChange("state", result.address.state || "");
          setAddressFound(true);
        } else {
          if (result.errorType === "not_found") {
            setCepLookupError("not_found");
            toast.error("CEP não encontrado. Você pode continuar sem endereço e completar depois.");
          } else {
            setCepLookupError("service_unavailable");
            toast.info(
              "Não foi possível consultar o CEP agora. Continue e complete em Perfil > Endereço.",
            );
          }
        }
      } catch {
        setCepLookupError("service_unavailable");
        toast.info(
          "Não foi possível consultar o CEP agora. Continue e complete em Perfil > Endereço.",
        );
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
        <Label className="text-sm font-medium text-foreground mb-2 block">CEP</Label>
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
        {!addressFound && (
          <p className="mt-2 text-xs text-muted-foreground">
            Se não conseguir validar o CEP agora, você pode continuar e cadastrar o endereço depois
            em Perfil &gt; Endereço.
          </p>
        )}
        {cepLookupError === "service_unavailable" && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            <p className="text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Os serviços de CEP estão indisponíveis no momento. Continue sem endereço e finalize
              depois no seu perfil.
            </p>
          </div>
        )}
        {cepLookupError === "not_found" && (
          <div className="mt-3 rounded-xl border border-border bg-muted/50 px-3 py-2 text-muted-foreground">
            <p className="text-xs">
              CEP não encontrado. Você pode continuar sem endereço agora e completar depois em
              Perfil &gt; Endereço.
            </p>
          </div>
        )}
      </div>

      {/* Endereço preenchido automaticamente: rua já preenchida, usuário só informa o número */}
      {addressFound && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Rua</Label>
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
              Número <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Ex.: 123, 45 A"
              value={data.number}
              onChange={(e) => onChange("number", e.target.value)}
              className="h-12 bg-muted/50 border-border rounded-xl"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Complemento <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              type="text"
              placeholder="Ex.: Apto 101, Bloco B, Casa 2"
              value={data.complement}
              onChange={(e) => onChange("complement", e.target.value)}
              className="h-12 bg-muted/50 border-border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Bairro</Label>
              <Input
                type="text"
                value={data.neighborhood}
                onChange={(e) => onChange("neighborhood", e.target.value)}
                className="h-12 bg-muted/50 border-border rounded-xl"
                readOnly
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Cidade</Label>
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

      {/* Botão - pode seguir mesmo sem endereço para evitar bloqueio */}
      <div className="pt-2">
        <Button
          onClick={onContinue}
          className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl"
        >
          {addressFound ? "Continuar" : "Continuar sem endereço agora"}
        </Button>
      </div>
    </div>
  );
};

export default LocationStep;
