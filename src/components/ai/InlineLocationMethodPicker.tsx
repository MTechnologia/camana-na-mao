import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Pencil, Loader2 } from "lucide-react";
import { reverseGeocodeLatLngClient } from "@/lib/reverseGeocodeLatLngClient";
import { isGpsAccuracyAcceptable } from "@/lib/gpsAccuracy";

export type LocationMethod = "gps" | "registered_address" | "manual";

interface InlineLocationMethodPickerProps {
  onSelect: (method: LocationMethod, messageToSend: string) => void;
}

const OPTIONS: { id: LocationMethod; label: string; description: string; icon: typeof MapPin }[] = [
  {
    id: "gps",
    label: "Usar minha localização (GPS)",
    description:
      "Obtém coordenadas e, com a chave do Google Maps configurada, envia também o endereço aproximado ao assistente.",
    icon: MapPin,
  },
  {
    id: "registered_address",
    label: "Usar endereço cadastrado",
    description: "Usa o endereço do seu perfil",
    icon: Home,
  },
  {
    id: "manual",
    label: "Digitar CEP ou endereço",
    description: "Informe o CEP ou a rua e bairro",
    icon: Pencil,
  },
];

export const InlineLocationMethodPicker = ({ onSelect }: InlineLocationMethodPickerProps) => {
  const [selected, setSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGps = () => {
    if (!navigator.geolocation) {
      setError("Seu navegador não suporta geolocalização.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        if (!isGpsAccuracyAcceptable(accuracy)) {
          setLoading(false);
          setError(
            accuracy != null
              ? `Precisão insuficiente (${Math.round(accuracy)}m). Requer ≤15m. Tente em área aberta ou use CEP.`
              : "Não foi possível verificar a precisão do GPS. Tente em área aberta ou use CEP/endereço."
          );
          return;
        }

        try {
          // Reverse geocoding (GPS → endereço) para o modelo e ferramentas; cache compartilhado com Perto de você.
          const friendly = await reverseGeocodeLatLngClient(lat, lon);
          const humanLine = friendly ? `📍 ${friendly}` : "📍 Sua posição atual (GPS)";
          // Linha "Localização GPS:" permanece para o orquestrador; na UI a linha técnica pode ser ocultada (UserChatBubbleText).
          onSelect("gps", `${humanLine}\nLocalização GPS: ${lat},${lon}`);
        } finally {
          setSelected(true);
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Permissão negada. Ative a localização no navegador e no celular (configurações) e tente novamente.");
        } else {
          setError("Não foi possível obter sua localização. Tente digitar o CEP ou endereço.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleSelect = (method: LocationMethod) => {
    if (method === "gps") {
      handleGps();
      return;
    }
    setSelected(true);
    const messages: Record<LocationMethod, string> = {
      gps: "",
      registered_address: "Usar endereço cadastrado",
      manual: "Digitar CEP ou endereço",
    };
    onSelect(method, messages[method]);
  };

  if (selected && !loading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <MapPin className="h-3 w-3" />
        <span>Localização definida ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-sm">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span>Como informar sua localização?</span>
      </div>
      <div className="flex flex-col gap-2">
        {OPTIONS.map(({ id, label, description, icon: Icon }) => (
          <Button
            key={id}
            variant="outline"
            size="sm"
            onClick={() => handleSelect(id)}
            disabled={loading}
            className="flex items-start gap-3 h-auto py-2.5 px-3 text-left justify-start"
          >
            {loading && id === "gps" ? (
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 mt-0.5" />
            ) : (
              <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            )}
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground font-normal">{description}</span>
            </span>
          </Button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export default InlineLocationMethodPicker;
