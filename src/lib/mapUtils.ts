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
 * Horário padrão quando a fonte (GeoSampa) não fornece `opening_hours.text`.
 * Mantém compatibilidade com o que já é exibido em `ServiceDetailPage`.
 */
export const DEFAULT_OPENING_HOURS_BY_TYPE: Record<string, string> = {
  ubs: "Segunda a sexta, 7h às 19h (horário padrão das UBS em SP). Confirme na unidade.",
  hospital: "Atendimento 24h ou conforme unidade. Confirme pelo telefone.",
  library: "Segunda a sexta, em geral 9h às 18h. Confirme na unidade.",
  school: "Conforme calendário escolar. Confirme na unidade.",
  ceu: "Conforme programação. Confirme na unidade.",
  sports_center: "Varía por unidade. Confirme no local.",
};

/**
 * Retorna o texto de opening_hours se existir; caso contrário retorna um fallback
 * baseado no `serviceType` (para filtros de horário no NearbyServicesPage).
 */
export const getOpeningHoursTextWithDefault = (
  openingHours: unknown,
  serviceType?: string | null
): string | null => {
  const extracted = getOpeningHoursText(openingHours);
  if (extracted) return extracted;
  if (!serviceType) return null;
  return DEFAULT_OPENING_HOURS_BY_TYPE[serviceType] ?? null;
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

  // Extração robusta de horários em diferentes formatos:
  // - HH:MM (ex.: 07:00)
  // - HhMM (ex.: 07h00)
  // - Hh (ex.: 07h)  => assume minutos=00
  //
  // Depois pegamos as 2 primeiras ocorrências como (abertura, fechamento).
  const times: number[] = [];
  const timeRegex =
    /(\d{1,2})\s*:\s*(\d{2})\b|(\d{1,2})\s*h\s*(\d{2})\b|(\d{1,2})\s*h\b/gi;

  for (const match of text.matchAll(timeRegex)) {
    // match[1], match[2] => HH:MM
    if (match[1] != null && match[2] != null) {
      const v = toMinutes(match[1], match[2]);
      if (v != null) times.push(v);
      continue;
    }
    // match[3], match[4] => HhMM
    if (match[3] != null && match[4] != null) {
      const v = toMinutes(match[3], match[4]);
      if (v != null) times.push(v);
      continue;
    }
    // match[5] => Hh
    if (match[5] != null) {
      const v = toMinutes(match[5], "00");
      if (v != null) times.push(v);
    }
  }

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

/** Formata distância quando não há rota (Haversine). Exibimos só o valor, sem "(em linha reta)", por decisão de produto. */
export const formatDistanceStraightLine = (meters: number): string => {
  return formatDistance(meters);
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
