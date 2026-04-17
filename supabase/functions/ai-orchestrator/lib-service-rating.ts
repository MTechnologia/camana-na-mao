import type { SupabaseClient } from "@supabase/supabase-js";

// ========== SERVICE RATING ==========
export const SERVICE_RATING_DIMENSION_KEYS = ["atendimento", "limpeza", "infraestrutura", "tempo_espera"] as const;

export function isCompleteServiceRatingDimensions(o: unknown): boolean {
  if (!o || typeof o !== "object") return false;
  const rec = o as Record<string, unknown>;
  for (const k of SERVICE_RATING_DIMENSION_KEYS) {
    const n = Number(rec[k]);
    if (!Number.isInteger(n) || n < 1 || n > 5) return false;
  }
  return true;
}

export function parseRatingDimensionsMarker(content: string): Record<string, number> | null {
  const marker = "[RATING_DIMENSIONS:";
  const idx = content.indexOf(marker);
  if (idx < 0) return null;
  const start = idx + marker.length;
  const end = content.indexOf("]", start);
  if (end < 0) return null;
  try {
    const o = JSON.parse(content.slice(start, end)) as Record<string, unknown>;
    if (!isCompleteServiceRatingDimensions(o)) return null;
    return o as Record<string, number>;
  } catch {
    return null;
  }
}

export const SERVICE_RATING_DEDUP_TZ = "America/Sao_Paulo";

function zonedCalendarDayKey(timeZone: string, instantMs: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(instantMs),
  );
}

export function getZonedDayUtcBoundsISO(
  timeZone: string,
  ref: Date = new Date(),
): { startIso: string; endExclusiveIso: string } {
  const refMs = ref.getTime();
  const dayKey = zonedCalendarDayKey(timeZone, refMs);
  let lo = refMs - 26 * 3600000;
  let hi = refMs + 26 * 3600000;
  while (zonedCalendarDayKey(timeZone, lo) >= dayKey) lo -= 3600000;
  while (zonedCalendarDayKey(timeZone, hi) < dayKey) hi += 3600000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (zonedCalendarDayKey(timeZone, mid) < dayKey) lo = mid;
    else hi = mid;
  }
  const startMs = Math.ceil(hi);
  let lo2 = startMs;
  let hi2 = startMs + 40 * 3600000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo2 + hi2) / 2;
    if (zonedCalendarDayKey(timeZone, mid) === dayKey) lo2 = mid;
    else hi2 = mid;
  }
  const endExclusiveMs = Math.ceil(hi2);
  return { startIso: new Date(startMs).toISOString(), endExclusiveIso: new Date(endExclusiveMs).toISOString() };
}

export const SERVICE_RATING_DUPLICATE_DAY_MESSAGE =
  "Você já avaliou este serviço hoje. Só é permitida uma avaliação por dia para o mesmo equipamento — você pode avaliar outro serviço agora ou voltar amanhã para este.";

export function aggregateRatingDimensionsStars(dim: Record<string, number>): number {
  const vals = SERVICE_RATING_DIMENSION_KEYS.map((k) => Number(dim[k]));
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function applyCompleteRatingDimensionsToAccumulated(
  accumulated: Record<string, unknown>,
  rd: Record<string, number>,
): void {
  accumulated.rating_dimensions = rd;
  accumulated.rating_stars = aggregateRatingDimensionsStars(rd);
  accumulated.tempo_espera_score = rd.tempo_espera;
  accumulated.atendimento_score = rd.atendimento;
  accumulated.infraestrutura_score = rd.infraestrutura;
  accumulated.limpeza_score = rd.limpeza;
  accumulated.wait_time_score = Math.min(5, Math.max(2, rd.tempo_espera));
}

export function shouldOfferServiceRatingReferral(
  stars: number,
  dims: Record<string, number> | null | undefined,
): boolean {
  if (Number.isInteger(stars) && stars >= 1 && stars <= 2) return true;
  if (!dims || typeof dims !== "object") return false;
  for (const k of SERVICE_RATING_DIMENSION_KEYS) {
    const n = Number((dims as Record<string, number>)[k]);
    if (Number.isInteger(n) && n >= 1 && n <= 2) return true;
  }
  return false;
}

export function inferServiceRatingSentimentFromMean(meanStars: number): "positive" | "neutral" | "negative" {
  const m = Math.round(Number(meanStars));
  if (m >= 4) return "positive";
  if (m <= 2) return "negative";
  return "neutral";
}

export async function fetchServiceTypeRatingQuestionHints(
  supabase: SupabaseClient,
  serviceType: string,
): Promise<string> {
  const st = String(serviceType || "").trim().toLowerCase();
  if (!st) return "";
  try {
    const { data, error } = await supabase
      .from("service_type_rating_questions")
      .select("hint_text")
      .eq("service_type", st)
      .order("sort_order", { ascending: true })
      .limit(5);
    if (error || !data?.length) return "";
    return "\n\n" + data.map((r: { hint_text: string }) => `• _${r.hint_text}_`).join("\n");
  } catch {
    return "";
  }
}

export function buildServiceRatingDimensionsFromWizardScores(
  args: Record<string, unknown>,
  accumulated: Record<string, unknown> | null | undefined,
): Record<string, number> | null {
  const get = (k: string): unknown => {
    if (args && k in args && args[k] !== undefined) return args[k];
    if (accumulated && k in accumulated && (accumulated as Record<string, unknown>)[k] !== undefined) {
      return (accumulated as Record<string, unknown>)[k];
    }
    return undefined;
  };
  const att = get("atendimento_score");
  const inf = get("infraestrutura_score");
  const limRaw = get("limpeza_score");
  const tempoDim = get("tempo_espera_score");
  const wt = get("wait_time_score");

  if (typeof att !== "number" || typeof inf !== "number") return null;
  if (!Number.isInteger(att) || att < 1 || att > 5) return null;
  if (!Number.isInteger(inf) || inf < 1 || inf > 5) return null;

  const lim =
    typeof limRaw === "number" && Number.isInteger(limRaw) && limRaw >= 1 && limRaw <= 5 ? limRaw : null;
  if (lim === null) return null;

  let tempo: number;
  if (typeof tempoDim === "number" && Number.isInteger(tempoDim) && tempoDim >= 1 && tempoDim <= 5) {
    tempo = tempoDim;
  } else if (wt === null) {
    tempo = 3;
  } else if (typeof wt === "number" && Number.isInteger(wt) && wt >= 2 && wt <= 5) {
    tempo = wt;
  } else {
    return null;
  }

  const out = { atendimento: att, limpeza: lim, infraestrutura: inf, tempo_espera: tempo };
  return isCompleteServiceRatingDimensions(out) ? (out as Record<string, number>) : null;
}

export function getServiceRatingNounPt(serviceType: string | undefined): string {
  const SERVICE_RATING_NOUN_PT: Record<string, string> = {
    ubs: "UBS",
    school: "escola",
    hospital: "hospital",
    ceu: "CEU",
    library: "biblioteca",
    sports_center: "centro esportivo",
    street_market: "feira",
    community_center: "centro comunitário",
    daycare: "creche",
    park: "parque",
    market: "mercado",
    city_market: "mercado municipal",
    theater: "teatro",
    museum: "museu",
    social_assistance: "assistência social",
    transit_station: "terminal/estação de transporte",
    police_station: "delegacia",
    cemetery: "cemitério",
    accessibility: "serviço de acessibilidade",
    recycling_point: "ponto de reciclagem",
    fire_station: "Corpo de Bombeiros",
    other: "serviço",
  };
  if (!serviceType) return "serviço";
  return SERVICE_RATING_NOUN_PT[serviceType] || serviceType;
}

function foldAccentsForCompare(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeGenericServiceRatingName(s: string): string {
  return foldAccentsForCompare(
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\bhospitais\b/g, "hospital")
      .replace(/\bbibliotecas\b/g, "biblioteca")
      .replace(/\bescolas\b/g, "escola")
      .replace(/\bceus\b/g, "ceu")
      .replace(/\bfeiras\b/g, "feira")
      .replace(/\bparques\b/g, "parque")
      .replace(/\bmercados\b/g, "mercado"),
  );
}

export function inferServiceRatingNeighborhoodFromCompositeName(
  serviceName: unknown,
  serviceType: string | undefined,
): string | undefined {
  const sn = String(serviceName ?? "").trim();
  if (sn.length < 3) return undefined;
  const noun = getServiceRatingNounPt(serviceType);
  const escaped = noun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*${escaped}\\s*-\\s*(.+)$`, "i");
  const m = sn.match(re);
  if (!m) return undefined;
  const rest = m[1].trim();
  return rest.length >= 2 ? rest : undefined;
}

export function isServiceRatingTypeOnlyEquipmentName(
  serviceName: unknown,
  serviceType: string | undefined,
): boolean {
  const raw = String(serviceName ?? "").trim();
  if (raw.length < 2) return true;

  const s = normalizeGenericServiceRatingName(raw);
  const noun = normalizeGenericServiceRatingName(getServiceRatingNounPt(serviceType));
  if (!s || s === noun) return true;

  const TYPE_ONLY = new Set<string>([
    "ubs",
    "ceu",
    "ceus",
    "hospital",
    "hospitais",
    "escola",
    "escolas",
    "biblioteca",
    "bibliotecas",
    "feira",
    "feiras",
    "parque",
    "parques",
    "mercado",
    "mercados",
    "mercado municipal",
    "creche",
    "creches",
    "teatro",
    "teatros",
    "museu",
    "museus",
    "centro esportivo",
    "centro comunitário",
    "delegacia",
    "cemitério",
    "esportes",
    "outros",
    "servico",
    "serviço",
    "posto de saude",
    "posto de saúde",
    "assistência social",
    "terminal/estação de transporte",
    "corpo de bombeiros",
    "ponto de reciclagem",
    "acessibilidade",
  ]);

  if (TYPE_ONLY.has(s)) return true;

  const eng = raw.toLowerCase();
  if (["library", "school", "hospital", "park", "museum", "theater", "other", "daycare", "cemetery"].includes(eng)) {
    return true;
  }

  return false;
}

export function buildServiceRatingBairroPrompt(serviceType: string | undefined): string {
  const t = serviceType || "";
  if (t === "ubs") {
    return "Em qual **bairro** fica a **UBS** que você visitou?";
  }
  if (t === "ceu") {
    return "Em qual **bairro** fica o **CEU** que você visitou?";
  }
  const noun = getServiceRatingNounPt(t);
  const masculineArticleTypes = new Set([
    "hospital",
    "sports_center",
    "community_center",
    "park",
    "market",
    "city_market",
    "theater",
    "museum",
    "cemetery",
    "transit_station",
    "police_station",
    "fire_station",
    "street_market",
    "other",
    "accessibility",
    "recycling_point",
  ]);
  const art = masculineArticleTypes.has(t) ? "o" : "a";
  return `Em qual **bairro** fica ${art} **${noun}** que você visitou?`;
}

export function buildServiceRatingDimensionsPrompt(serviceType: string | undefined): string {
  const t = String(serviceType || "").trim().toLowerCase();
  if (!t) {
    return "**Avalie em quatro aspectos** (1 a 5 estrelas cada): tempo de espera, atendimento, infraestrutura e limpeza. Use o formulário abaixo.";
  }
  if (t === "ubs") {
    return "**Avalie a UBS em quatro aspectos** (1 a 5 estrelas cada): tempo de espera, atendimento, infraestrutura e limpeza. Use o formulário abaixo.";
  }
  if (t === "ceu") {
    return "**Avalie o CEU em quatro aspectos** (1 a 5 estrelas cada): tempo de espera, atendimento, infraestrutura e limpeza. Use o formulário abaixo.";
  }
  const noun = getServiceRatingNounPt(t);
  const masculineArticleTypes = new Set([
    "hospital",
    "sports_center",
    "community_center",
    "park",
    "market",
    "city_market",
    "theater",
    "museum",
    "cemetery",
    "transit_station",
    "police_station",
    "fire_station",
    "street_market",
    "other",
    "accessibility",
    "recycling_point",
  ]);
  const article = masculineArticleTypes.has(t) ? "o" : "a";
  return `**Avalie ${article} ${noun} em quatro aspectos** (1 a 5 estrelas cada): tempo de espera, atendimento, infraestrutura e limpeza. Use o formulário abaixo.`;
}
