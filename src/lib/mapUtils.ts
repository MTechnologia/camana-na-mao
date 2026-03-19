/** Nome legível para exibição. Se o nome no banco for ID técnico (ex.: ponto_onibus.fid--...), usa "Ponto de ônibus" + endereço/bairro. */
export const getServiceDisplayName = (params: {
  name: string;
  address?: string;
  district?: string;
  service_type?: string;
}): string => {
  const { name, address, district } = params;
  const isTechnicalId = /ponto_onibus\.fid--|\.fid--[a-f0-9_]+$/i.test(name?.trim() ?? "") ||
    (name?.startsWith("Ponto de Onibus ") && name.includes("fid--"));
  if (isTechnicalId) {
    const addr = (address ?? "").trim();
    const addrOk = addr && !/endere[cç]o\s*n[aã]o\s*informado/i.test(addr);
    const suffix = [addrOk ? addr : null, district?.trim()].filter(Boolean)[0];
    return suffix ? `Ponto de ônibus – ${suffix}` : "Ponto de ônibus";
  }
  return name?.trim() || "Serviço";
};

/** Extrai texto de opening_hours (JSONB: { text } ou string, inclusive JSON stringificado). Retorna null se vazio. */
export const getOpeningHoursText = (openingHours: unknown): string | null => {
  if (openingHours == null) return null;
  if (typeof openingHours === "string") {
    const s = openingHours.trim();
    if (!s) return null;
    // JSON stringificado pelo backend/CSV: {"text":"..."}
    if (s.startsWith("{")) {
      try {
        const parsed = JSON.parse(s) as { text?: string };
        const t = parsed?.text;
        return typeof t === "string" && t.trim() ? t.trim() : null;
      } catch {
        return s; // não é JSON válido, usa como texto
      }
    }
    return s;
  }
  const text = (openingHours as { text?: string })?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
};

/**
 * Interpreta um texto de opening_hours (ex.: "08:00 - 17:00", "08h às 17h")
 * e retorna o intervalo em minutos desde 00:00.
 *
 * Retorna { openMinutes: null, closeMinutes: null } quando não for possível identificar.
 *
 * Obs.: esta função existe para manter compatibilidade com fluxos/filters que
 * comparam horários em minutos (ex.: filtros de "abre a partir de"/"fecha até").
 */
export const parseOpeningHoursToRange = (
  openingHoursText: string | null | undefined
): { openMinutes: number | null; closeMinutes: number | null } => {
  if (!openingHoursText) return { openMinutes: null, closeMinutes: null };

  const text = openingHoursText.toString().replace(/\s+/g, " ").trim();

  const toMinutes = (hRaw: string, mRaw: string) => {
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23) return null;
    if (m < 0 || m > 59) return null;
    return h * 60 + m;
  };

  // Padrão com minutos: "08:00 - 17:00" / "08:00 às 17:00"
  const rangeWithMinutes = text.match(
    /(\d{1,2})\s*(?::|h)\s*(\d{2})\s*(?:-|–|—|a|às|to)\s*(\d{1,2})\s*(?::|h)\s*(\d{2})/i
  );
  if (rangeWithMinutes) {
    const open = toMinutes(rangeWithMinutes[1], rangeWithMinutes[2]);
    const close = toMinutes(rangeWithMinutes[3], rangeWithMinutes[4]);
    return { openMinutes: open, closeMinutes: close };
  }

  // Padrão apenas horas com "h": "08h - 17h" -> assume minutos=00
  const rangeWithHoursOnly = text.match(
    /(\d{1,2})\s*h\b\s*(?:-|–|—|a|às|to)\s*(\d{1,2})\s*h\b/i
  );
  if (rangeWithHoursOnly) {
    const open = toMinutes(rangeWithHoursOnly[1], "00");
    const close = toMinutes(rangeWithHoursOnly[2], "00");
    return { openMinutes: open, closeMinutes: close };
  }

  // Fallback: pega a 1a e a 2a ocorrência de HH:MM e usa como range (quando existe)
  const times = Array.from(text.matchAll(/(\d{1,2})\s*(?::)\s*(\d{2})/g))
    .map((m) => toMinutes(m[1], m[2]))
    .filter((v): v is number => v != null);

  if (times.length >= 2) {
    return { openMinutes: times[0], closeMinutes: times[1] };
  }
  if (times.length === 1) {
    return { openMinutes: times[0], closeMinutes: null };
  }

  return { openMinutes: null, closeMinutes: null };
};

/** Retorna texto para exibição de endereço; trata "Endereço não informado" e vazio. */
export const getAddressDisplay = (address: string | undefined | null, district?: string | undefined | null): string => {
  const addr = (address ?? "").trim();
  const isMissing = !addr || /endere[cç]o\s*n[aã]o\s*informado/i.test(addr);
  if (isMissing) {
    return district?.trim() ? `Localização no mapa · ${district}` : "Localização disponível no mapa";
  }
  return district?.trim() ? `${addr}, ${district}` : addr;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/** Formata distância em linha reta e deixa explícito para o usuário (evita confusão com distância da rota no Maps). */
export const formatDistanceStraightLine = (meters: number): string => {
  const value = formatDistance(meters);
  return `${value} (em linha reta)`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
};

const maneuverTranslations: Record<string, string> = {
  "turn-right": "Vire à direita",
  "turn-left": "Vire à esquerda",
  "sharp-right": "Vire acentuadamente à direita",
  "sharp-left": "Vire acentuadamente à esquerda",
  "slight-right": "Mantenha-se à direita",
  "slight-left": "Mantenha-se à esquerda",
  "straight": "Siga em frente",
  "uturn": "Faça retorno",
  "arrive": "Você chegou ao destino",
  "depart": "Inicie o percurso",
  "ramp-right": "Entre à direita na rampa",
  "ramp-left": "Entre à esquerda na rampa",
  "merge": "Entre na via",
  "roundabout": "Entre na rotatória",
  "rotary": "Entre na rotatória",
  "exit-roundabout": "Saia da rotatória",
  "exit-rotary": "Saia da rotatória",
  "fork": "Bifurcação",
  "end-of-road": "Final da via",
  "continue": "Continue",
};

export const translateManeuver = (maneuver: string): string => {
  return maneuverTranslations[maneuver] || maneuver;
};

const maneuverIcons: Record<string, string> = {
  "turn-right": "↱",
  "turn-left": "↰",
  "sharp-right": "⤴",
  "sharp-left": "⤵",
  "slight-right": "↗",
  "slight-left": "↖",
  "straight": "↑",
  "uturn": "↩",
  "arrive": "📍",
  "depart": "🚶",
  "ramp-right": "↗",
  "ramp-left": "↖",
  "merge": "↗",
  "roundabout": "↻",
  "rotary": "↻",
  "exit-roundabout": "↗",
  "exit-rotary": "↗",
  "fork": "↗",
  "end-of-road": "↑",
  "continue": "↑",
};

export const getManeuverIcon = (maneuver: string): string => {
  return maneuverIcons[maneuver] || "↑";
};

export const buildGoogleMapsUrl = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string => {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=walking`;
};

export const buildWazeUrl = (destLat: number, destLng: number): string => {
  return `https://www.waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
};
