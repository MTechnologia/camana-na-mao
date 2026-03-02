import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import { lookupCepAddress } from "@/lib/cepLookup";

export interface CepCenter {
  latitude: number;
  longitude: number;
  label: string;
}

interface CepSearchCardProps {
  /** Centro definido por CEP (quando preenchido, a busca usa este ponto em vez da localização do usuário). */
  cepCenter: CepCenter | null;
  onCepCenterChange: (center: CepCenter | null) => void;
  disabled?: boolean;
}

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export function CepSearchCard({ cepCenter, onCepCenterChange, disabled }: CepSearchCardProps) {
  const [cepInput, setCepInput] = useState("");
  const [loading, setLoading] = useState(false);

  const apiKey = getGoogleMapsApiKey();

  const searchByCep = useCallback(async () => {
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("Informe um CEP válido (8 dígitos)");
      return;
    }
    if (!apiKey) {
      toast.error(getGoogleMapsNotConfiguredMessage());
      return;
    }
    setLoading(true);
    try {
      const result = await lookupCepAddress(clean);
      if (!result.ok) {
        if (result.errorType === "not_found") {
          toast.error("CEP não encontrado");
        } else {
          toast.info("Não foi possível consultar o CEP agora. Tente novamente em instantes.");
        }
        setLoading(false);
        return;
      }
      const addressParts = [
        result.address.street,
        result.address.neighborhood,
        result.address.city,
        result.address.state,
        "Brasil",
      ].filter(Boolean);
      const address = addressParts.join(", ");
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-BR`;
      const geoRes = await fetch(geocodeUrl);
      const geoData = await geoRes.json();
      const first = geoData?.results?.[0];
      if (!first?.geometry?.location) {
        toast.error("Não foi possível localizar o endereço deste CEP");
        setLoading(false);
        return;
      }
      const { lat, lng } = first.geometry.location;
      const label = first.formatted_address ?? address;
      onCepCenterChange({ latitude: lat, longitude: lng, label });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoading(false);
    }
  }, [cepInput, apiKey, onCepCenterChange]);

  const clearCep = useCallback(() => {
    setCepInput("");
    onCepCenterChange(null);
  }, [onCepCenterChange]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Buscar por CEP
          </span>
        </div>
        {cepCenter ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-2" title={cepCenter.label}>
              Próximo de: {cepCenter.label}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={clearCep}
              disabled={disabled}
            >
              <X className="w-4 h-4 mr-2" />
              Usar minha localização
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="00000-000"
              value={cepInput}
              onChange={(e) => setCepInput(formatCep(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && searchByCep()}
              className="flex-1"
              maxLength={9}
              disabled={disabled}
            />
            <Button
              type="button"
              size="default"
              onClick={searchByCep}
              disabled={disabled || loading || cepInput.replace(/\D/g, "").length < 8}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
