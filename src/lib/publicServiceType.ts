/**
 * Valores do enum `public.service_type` no Postgres (snake_case em inglês).
 * O chat/orquestrador às vezes envia rótulos em PT ("hospitais") — isso quebra `.eq(service_type, ...)`.
 */
const LABEL_OR_SLUG_TO_ENUM: Record<string, string> = {
  hospitais: "hospital",
  hospital: "hospital",
  bibliotecas: "library",
  library: "library",
  biblioteca: "library",
  escolas: "school",
  school: "school",
  escola: "school",
  ceus: "ceu",
  ceu: "ceu",
  ubs: "ubs",
  esportes: "sports_center",
  "centros esportivos": "sports_center",
  "centro esportivo": "sports_center",
  sports_center: "sports_center",
  feiras: "street_market",
  street_market: "street_market",
  "centros comunitários": "community_center",
  community_center: "community_center",
  creches: "daycare",
  daycare: "daycare",
  parques: "park",
  park: "park",
  mercados: "market",
  market: "market",
  "mercados municipais": "city_market",
  city_market: "city_market",
  "teatro/cinema": "theater",
  teatros: "theater",
  theater: "theater",
  museus: "museum",
  museum: "museum",
  "assistência social": "social_assistance",
  social_assistance: "social_assistance",
  transporte: "transit_station",
  transit_station: "transit_station",
  "delegacia/polícia": "police_station",
  police_station: "police_station",
  cemitério: "cemetery",
  cemetery: "cemetery",
  acessibilidade: "accessibility",
  accessibility: "accessibility",
  "reciclagem/limpeza": "recycling_point",
  recycling_point: "recycling_point",
  bombeiros: "fire_station",
  fire_station: "fire_station",
  outros: "other",
  other: "other",
};

/** Converte rótulo do chip / texto livre para valor válido do enum `service_type`. */
export function normalizeServiceTypeToDbEnum(raw: string | undefined): string | undefined {
  if (raw == null || String(raw).trim() === "") return undefined;
  const k = String(raw).toLowerCase().trim();
  return LABEL_OR_SLUG_TO_ENUM[k] ?? k;
}

/**
 * Equipamentos públicos relevantes ao munícipe (UBS, hospitais, escolas,
 * bibliotecas, etc.). Usado quando o picker busca SEM um tipo específico — para
 * NÃO trazer ruído da base GeoSampa: `transit_station` (endereços de rua, ex.:
 * "AV. Caxingui, 626") e `other` (features de GIS, ex.: "quadra_viaria_editada…").
 * AMAs/UPAs estão sob `ubs`/`hospital`.
 */
export const CITIZEN_EQUIPMENT_SERVICE_TYPES = [
  "ubs",
  "hospital",
  "school",
  "ceu",
  "library",
  "daycare",
  "park",
  "sports_center",
  "community_center",
  "social_assistance",
  "police_station",
  "fire_station",
  "subprefeitura",
  "market",
  "city_market",
  "street_market",
  "theater",
  "museum",
  "cemetery",
] as const;
