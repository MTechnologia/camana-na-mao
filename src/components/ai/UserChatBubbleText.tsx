import { useEffect, useState } from "react";
import { sanitizeMessageContent } from "@/lib/sanitizeMarkers";
import { formatUserMessageHidingGpsLine } from "@/lib/formatUserMessageHidingGpsLine";
import { reverseGeocodeLatLngClient } from "@/lib/reverseGeocodeLatLngClient";

function UserGpsFallback({ lat, lon }: { lat: number; lon: number }) {
  const [label, setLabel] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reverseGeocodeLatLngClient(lat, lon).then((t) => {
      if (cancelled) return;
      setLabel(t);
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  if (!resolved) {
    return (
      <p className="text-sm text-primary-foreground/90" aria-live="polite">
        📍 Obtendo endereço…
      </p>
    );
  }
  if (label) {
    return <p className="text-sm whitespace-pre-wrap">📍 {label}</p>;
  }
  return (
    <p className="text-sm text-primary-foreground/90">📍 Sua posição atual (GPS)</p>
  );
}

/**
 * Bolha do usuário: não exibe a linha técnica "Localização GPS: lat,lon"
 * (o conteúdo bruto segue em `message.content` para o orchestrator).
 */
export function UserChatBubbleText({ content }: { content: string }) {
  const sanitized = sanitizeMessageContent(content);
  const { visibleText, coordsOnly } = formatUserMessageHidingGpsLine(sanitized);

  if (visibleText) {
    return <p className="text-sm whitespace-pre-wrap">{visibleText}</p>;
  }
  if (coordsOnly) {
    return <UserGpsFallback lat={coordsOnly.lat} lon={coordsOnly.lon} />;
  }
  return <p className="text-sm whitespace-pre-wrap">{sanitized}</p>;
}
