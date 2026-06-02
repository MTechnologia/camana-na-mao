import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X, Home, Navigation } from "lucide-react";
import { toast } from "sonner";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import { useAuth } from "@/contexts/AuthContext";
import type { CepCenter } from "@/components/map/CepSearchCard";
import { lookupCepAddress } from "@/lib/cepLookup";

/** Resumo: endereço fixo no mapa; escolha: GPS ou CEP (estado elevado na página). */
export type NearbyLocationUiPhase = "locked" | "picking";

interface LocationSearchCardProps {
  phase: NearbyLocationUiPhase;
  /** Rótulo exibido em "Próximo de:" quando phase === locked */
  lockedLabel: string | null;
  onAlterarLocal: () => void;
  onRequestGps: () => void;
  /** Logado: restaurar endereço do cadastro (snapshot ou fetch no pai) */
  onUseProfileAddress: () => void | Promise<void>;
  profileAddressLoading: boolean;
  onCepSearchComplete: (center: CepCenter) => void;
  geoLoading: boolean;
  gpsError: string | null;
}

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export function LocationSearchCard({
  phase,
  lockedLabel,
  onAlterarLocal,
  onRequestGps,
  onUseProfileAddress,
  profileAddressLoading,
  onCepSearchComplete,
  geoLoading,
  gpsError,
}: LocationSearchCardProps) {
  const { user } = useAuth();
  const [showCepInput, setShowCepInput] = useState(false);
  const [cepInput, setCepInput] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const apiKey = getGoogleMapsApiKey();
  const showUseProfileButton = !!user;

  const handleDigitarCep = useCallback(() => {
    setShowCepInput(true);
  }, []);

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
    setCepLoading(true);
    try {
      const result = await lookupCepAddress(clean);
      if (!result.ok) {
        if (result.errorType === "not_found") {
          toast.error("CEP não encontrado");
        } else {
          toast.info("Não foi possível consultar o CEP agora. Tente novamente em instantes.");
        }
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
        return;
      }
      const { lat, lng } = first.geometry.location;
      const label = first.formatted_address ?? address;
      onCepSearchComplete({ latitude: lat, longitude: lng, label });
      setShowCepInput(false);
      setCepInput("");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  }, [cepInput, apiKey, onCepSearchComplete]);

  const backFromCep = useCallback(() => {
    setShowCepInput(false);
    setCepInput("");
  }, []);

  if (phase === "locked") {
    const label = lockedLabel ?? "Local selecionado";
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Onde buscar serviços?</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-2" title={label}>
              Próximo de: {label}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onAlterarLocal}
            >
              <X className="w-4 h-4 mr-2" />
              Alterar local
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Onde buscar serviços?</span>
        </div>

        {showCepInput ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="00000-000"
                value={cepInput}
                onChange={(e) => setCepInput(formatCep(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && searchByCep()}
                className="flex-1"
                maxLength={9}
                disabled={cepLoading}
              />
              <Button
                type="button"
                size="default"
                onClick={searchByCep}
                disabled={cepLoading || cepInput.replace(/\D/g, "").length < 8}
              >
                {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={backFromCep}
              disabled={cepLoading}
            >
              Voltar às opções
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {gpsError ? (
              <p className="text-xs text-destructive" role="alert">
                {gpsError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-3 h-auto py-2.5"
              onClick={onRequestGps}
              disabled={geoLoading}
            >
              {geoLoading ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 shrink-0" />
              )}
              <span>Usar minha localização</span>
            </Button>
            {showUseProfileButton ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-3 h-auto py-2.5"
                onClick={() => void onUseProfileAddress()}
                disabled={profileAddressLoading}
              >
                {profileAddressLoading ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Home className="w-4 h-4 shrink-0" />
                )}
                <span>Usar endereço de cadastro</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-3 h-auto py-2.5"
              onClick={handleDigitarCep}
              disabled={cepLoading}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Digitar CEP</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
