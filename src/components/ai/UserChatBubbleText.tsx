import { useEffect, useState } from "react";
import { sanitizeMessageContent } from "@/lib/sanitizeMarkers";
import { formatUserMessageHidingGpsLine } from "@/lib/formatUserMessageHidingGpsLine";
import { reverseGeocodeLatLngClient } from "@/lib/reverseGeocodeLatLngClient";

/** Valores enviados por [QUICK_REPLY:reclamacao,duvida,...] — exibir rótulo PT na bolha do usuário. */
function displayUrbanReportNatureToken(text: string): string | null {
  const raw = text.trim();
  if (!raw || raw.length > 24 || /\s/.test(raw)) return null;
  const key = raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const map: Record<string, string> = {
    reclamacao: "Reclamação",
    duvida: "Dúvida",
    sugestao: "Sugestão",
    elogio: "Elogio",
  };
  return map[key] ?? null;
}

/** Valores enviados pelos botões de gravidade ([QUICK_REPLY:critical,...]) — exibir em PT na bolha. */
function displayUrbanRiskLevelToken(text: string): string | null {
  const raw = text.trim();
  if (!raw || raw.length > 32 || /\n/.test(raw)) return null;
  if (raw.includes(" ") && !/^sem\s+risco/i.test(raw)) return null;
  const key = raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, "");
  const map: Record<string, string> = {
    critical: "Crítico",
    moderate: "Moderado",
    low: "Baixo",
    none: "Nenhum",
    critico: "Crítico",
    critica: "Crítico",
    moderado: "Moderado",
    moderada: "Moderado",
    baixo: "Baixo",
    baixa: "Baixo",
    nenhum: "Nenhum",
    semrisco: "Nenhum",
    semriscoimediato: "Nenhum",
  };
  return map[key] ?? null;
}

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
  return <p className="text-sm text-primary-foreground/90">📍 Sua posição atual (GPS)</p>;
}

/**
 * Bolha do usuário: não exibe a linha técnica "Localização GPS: lat,lon"
 * (o conteúdo bruto segue em `message.content` para o orchestrator).
 */
export function UserChatBubbleText({ content }: { content: string }) {
  const sanitized = sanitizeMessageContent(content);
  const { visibleText, coordsOnly } = formatUserMessageHidingGpsLine(sanitized);

  const displayText = visibleText || sanitized;
  const natureAsPt = displayUrbanReportNatureToken(displayText);
  const riskAsPt = displayUrbanRiskLevelToken(displayText);

  if (visibleText) {
    return <p className="text-sm whitespace-pre-wrap">{natureAsPt ?? riskAsPt ?? visibleText}</p>;
  }
  if (coordsOnly) {
    return <UserGpsFallback lat={coordsOnly.lat} lon={coordsOnly.lon} />;
  }
  return <p className="text-sm whitespace-pre-wrap">{natureAsPt ?? riskAsPt ?? sanitized}</p>;
}
