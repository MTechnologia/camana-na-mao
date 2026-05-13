import { normalizeTransportRecurrenceFrequency, parseFlexibleOccurrenceTime } from "./lib-transport-parsing.ts";

export function parseAccessibilityDetailsMarker(content: string): Record<string, unknown> | null {
  const match = content.match(/\[ACCESSIBILITY_DETAILS:([A-Za-z0-9+/=_-]+)\]/);
  if (!match?.[1]) return null;
  try {
    const json = decodeURIComponent(escape(atob(match[1])));
    return normalizeTransportAccessibilityDetails(JSON.parse(json));
  } catch {
    return null;
  }
}

export function normalizeForMatching(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const TRANSPORT_TYPE_KEYWORDS: Record<string, string[]> = {
  atraso: ["atraso", "atrasado", "atrasou", "demora", "demorou", "esperando", "espera", "nao passou", "nunca chega"],
  lotacao: ["lotado", "lotacao", "cheio", "superlotado", "apertado", "sem espaco", "nao coube"],
  seguranca: [
    "seguranca",
    "assalto",
    "roubo",
    "assedio",
    "importunacao",
    "importunação",
    "importunou",
    "importunar",
    "insegura",
    "inseguro",
    "perigo",
    "medo",
    "ameaca",
    "briga",
    "agressao",
  ],
  limpeza: ["sujo", "sujeira", "limpeza", "fedendo", "fedor", "nojento", "imundo", "lixo", "vomito"],
  acessibilidade: ["acessibilidade", "cadeirante", "elevador", "rampa", "deficiente", "muleta", "pcd", "mobilidade"],
  conducao: ["motorista", "cobrador", "rude", "grosso", "mal educado", "nao parou", "conducao", "freada", "perigoso"],
};

export function fuzzyMatchKeyword(token: string, keywords: string[], maxDistance: number = 1): boolean {
  const normalizedToken = normalizeForMatching(token);
  if (normalizedToken.length < 3) return false;

  for (const kw of keywords) {
    const normalizedKw = normalizeForMatching(kw);

    if (normalizedToken === normalizedKw) return true;
    if (normalizedToken.includes(normalizedKw) || normalizedKw.includes(normalizedToken)) return true;

    const allowedDist = normalizedKw.length > 6 ? 2 : maxDistance;
    const distance = levenshteinDistance(normalizedToken, normalizedKw);
    if (distance <= allowedDist) {
      console.log(`[fuzzyMatch] Matched "${normalizedToken}" to "${normalizedKw}" (dist: ${distance})`);
      return true;
    }
  }
  return false;
}

export function inferTransportTypeFromText(text: string): string | null {
  const normalized = normalizeForMatching(text);
  const tokens = normalized.split(" ").filter((t) => t.length >= 3);

  console.log("[inferTransportTypeFromText] Tokens:", tokens.slice(0, 10));

  for (const [type, keywords] of Object.entries(TRANSPORT_TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      const normalizedKw = normalizeForMatching(kw);
      if (normalized.includes(normalizedKw)) {
        console.log(`[inferTransportTypeFromText] Direct match: "${normalizedKw}" -> ${type}`);
        return type;
      }
    }

    for (const token of tokens) {
      if (fuzzyMatchKeyword(token, keywords)) {
        console.log(`[inferTransportTypeFromText] Fuzzy match: "${token}" -> ${type}`);
        return type;
      }
    }
  }

  return null;
}

export function extractTransportFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const today = new Date().toISOString().split("T")[0];

  if (
    context.includes("atraso") || context.includes("atrasou") || context.includes("demora") ||
    context.includes("demorou") || context.includes("nao passou") || context.includes("não passou") ||
    context.includes("esperando muito") || context.includes("nunca chega") || context.includes("atrasado")
  ) {
    fields.report_type = "atraso";
  } else if (
    context.includes("lotad") || context.includes("chei") || context.includes("superlotad") ||
    context.includes("apertado") || context.includes("nao coube") || context.includes("não coube") ||
    context.includes("sem espaco") || context.includes("sem espaço") || context.includes("lotação")
  ) {
    fields.report_type = "lotacao";
  } else if (
    context.includes("seguranca") || context.includes("segurança") || context.includes("assalto") ||
    context.includes("roubo") || context.includes("assedio") || context.includes("assédio") ||
    context.includes("importun") || context.includes("insegur") ||
    context.includes("perigo") || context.includes("medo") || context.includes("ameaca") || context.includes("ameaça") ||
    context.includes("briga") || context.includes("agressao") || context.includes("agressão")
  ) {
    fields.report_type = "seguranca";
  } else if (
    context.includes("sujo") || context.includes("limpeza") || context.includes("fedendo") ||
    context.includes("fedor") || context.includes("nojento") || context.includes("imundo") ||
    context.includes("lixo") || context.includes("vomito") || context.includes("vômito")
  ) {
    fields.report_type = "limpeza";
  } else if (
    context.includes("acessib") || context.includes("cadeirante") || context.includes("elevador") ||
    context.includes("rampa") || context.includes("deficiente") || context.includes("muleta") ||
    context.includes("pcd") || context.includes("mobilidade")
  ) {
    fields.report_type = "acessibilidade";
  } else if (
    context.includes("motorista") || context.includes("cobrador") || context.includes("rude") ||
    context.includes("grosso") || context.includes("mal educado") || context.includes("mal-educado") ||
    context.includes("nao parou") || context.includes("não parou") || context.includes("conducao") ||
    context.includes("condução") || context.includes("freada") || context.includes("direcao perigosa") ||
    context.includes("direção perigosa")
  ) {
    fields.report_type = "conducao";
  }

  const lineMatch = context.match(/linha\s*(\d{3,4}[a-z]?[-/]?\d*)/i);
  if (lineMatch) fields.line_code = lineMatch[1].toUpperCase();

  if (context.includes("hoje") || context.includes("agora") || context.includes("acabou de")) {
    fields.occurrence_date = today;
    fields.date_confirmed = true;
  } else if (context.includes("ontem")) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    fields.occurrence_date = yesterday.toISOString().split("T")[0];
    fields.date_confirmed = true;
  }

  const parsedTime = parseFlexibleOccurrenceTime(context);
  if (parsedTime) {
    fields.occurrence_time = parsedTime;
  } else if (context.includes("manhã") || context.includes("cedo")) {
    fields.occurrence_time = "08:00";
  } else if (context.includes("tarde")) {
    fields.occurrence_time = "14:00";
  } else if (context.includes("noite")) {
    fields.occurrence_time = "19:00";
  }

  if (/\bida\b/.test(context)) {
    fields.direction = "ida";
  } else if (/\bvolta\b/.test(context)) {
    fields.direction = "volta";
  } else if (/\bcircular\b/.test(context)) {
    fields.direction = "circular";
  }

  const recurrence = normalizeTransportRecurrenceFrequency(context);
  if (recurrence) {
    fields.recurrence_frequency = recurrence;
  }

  if (context.includes("gravíssim") || context.includes("acidente") || context.includes("agressão") || context.includes("ferido")) {
    fields.severity = "critica";
  } else if (context.includes("muito atraso") || context.includes("mais de 30") || context.includes("horas esperando")) {
    fields.severity = "alta";
  } else if (context.includes("20 minutos") || context.includes("meia hora") || context.includes("bastante")) {
    fields.severity = "media";
  } else if (context.includes("desconfortável") || context.includes("chato") || context.includes("incômodo")) {
    fields.severity = "baixa";
  }

  return fields;
}

export function isTransportLinePickerPayload(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (/\[LINE_SELECTED:/i.test(t)) return true;
  if (/^linha:\s*\S+/i.test(t) && /\[LINE_SELECTED:/i.test(t)) return true;
  return false;
}

export function isCitySaoPaulo(city: string | undefined | null): boolean {
  if (!city || typeof city !== "string") return false;
  const normalized = city.trim().toLowerCase().normalize("NFD").replace(/\u0307/g, "").replace(/[\u0300-\u036f]/g, "");
  return normalized === "sao paulo" || normalized === "são paulo";
}

export const SAO_PAULO_TRANSPORT_MAP_BOUNDS = {
  minLat: -23.9,
  maxLat: -23.3,
  minLng: -46.85,
  maxLng: -46.36,
} as const;

export function isPointInSaoPauloBounds(lat: number, lng: number): boolean {
  return (
    lat >= SAO_PAULO_TRANSPORT_MAP_BOUNDS.minLat &&
    lat <= SAO_PAULO_TRANSPORT_MAP_BOUNDS.maxLat &&
    lng >= SAO_PAULO_TRANSPORT_MAP_BOUNDS.minLng &&
    lng <= SAO_PAULO_TRANSPORT_MAP_BOUNDS.maxLng
  );
}

export function getTransportReportLatLonForBounds(
  args: Record<string, unknown>,
  accumulated: Record<string, unknown> | null | undefined,
): { lat: number; lon: number } | null {
  const tryPair = (la: unknown, lo: unknown): { lat: number; lon: number } | null => {
    const lat = typeof la === "number" ? la : parseFloat(String(la ?? "").trim());
    const lon = typeof lo === "number" ? lo : parseFloat(String(lo ?? "").trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return { lat, lon };
  };
  const acc = accumulated ?? undefined;
  const fromGps = tryPair(
    args.user_lat ?? acc?.user_lat,
    args.user_lon ?? acc?.user_lon,
  );
  if (fromGps) return fromGps;
  const sl = String(args.stop_location ?? acc?.stop_location ?? "").trim();
  const coordOnly = sl.match(/^(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)$/);
  if (coordOnly) return tryPair(coordOnly[1], coordOnly[2]);
  return null;
}

export function normalizeTransportAccessibilityDetails(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const key = String(k).trim().slice(0, 80);
    if (!key) continue;
    if (typeof v === "boolean" || typeof v === "number") {
      if (typeof v === "number" && !Number.isFinite(v)) continue;
      out[key] = v;
    } else if (typeof v === "string") {
      const s = v.trim().slice(0, 500);
      if (s) out[key] = s;
    }
  }
  return Object.keys(out).length ? out : null;
}

export function formatTransportAccessibilitySummary(raw: unknown): string | null {
  const normalized = normalizeTransportAccessibilityDetails(raw);
  if (!normalized) return null;
  const labels: Record<string, string> = {
    rampa: "Rampa",
    elevador: "Elevador / escada rolante",
    piso_tatil: "Piso tátil",
    embarque_assistido: "Apoio para embarque",
    observacoes: "Observações",
  };
  const parts = Object.entries(normalized)
    .map(([key, value]) => {
      const label = labels[key] || key.replace(/_/g, " ");
      if (value === true) return label;
      if (value === false) return `${label}: não`;
      const text = String(value ?? "").trim();
      return text ? `${label}: ${text}` : null;
    })
    .filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

export const MESSAGE_OUTSIDE_SAO_PAULO = (
  cityName?: string,
) => cityName
  ? `Entendemos que o endereço informado é na **${cityName}**. No entanto, este canal é exclusivo para atendimentos realizados na cidade de São Paulo.\n\nVocê teria algum outro relato ou solicitação referente à cidade de São Paulo para que possamos ajudar?`
  : "Entendemos que o endereço informado fica fora da nossa área de atuação. No entanto, este canal é exclusivo para atendimentos realizados na cidade de São Paulo.\n\nVocê teria algum outro relato ou solicitação referente à cidade de São Paulo para que possamos ajudar?";
