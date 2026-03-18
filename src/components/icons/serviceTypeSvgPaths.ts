/**
 * Paths SVG (viewBox 0 0 24 24, stroke) por tipo de serviço.
 * Usados no mapa (balão) e referência para arquivos em public/icons/map/.
 * Fonte: estilo Lucide/Heroicons (MIT); ícones simples e reconhecíveis em tamanho reduzido.
 */
export type ServiceTypeKey =
  | "ubs"
  | "school"
  | "ceu"
  | "hospital"
  | "library"
  | "sports_center"
  | "street_market"
  | "community_center"
  | "daycare"
  | "park"
  | "market"
  | "city_market"
  | "theater"
  | "museum"
  | "social_assistance"
  | "transit_station"
  | "bicycle"
  | "subprefeitura"
  | "police_station"
  | "cemetery"
  | "accessibility"
  | "recycling_point"
  | "fire_station"
  | "other";

/** Path(s) para cada tipo – array de path d (stroke icons). */
export const SERVICE_TYPE_SVG_PATHS: Record<string, string[]> = {
  ubs: ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", "M6 12h12", "M6 8h12", "M6 16h12"],
  hospital: ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", "M6 12h12", "M6 8h12", "M6 16h12", "M10 2v6h4V2"],
  school: ["M4 19l5-4 5 4", "M4 14l5-4 5 4", "M4 9l8-5 8 5"],
  ceu: ["M3 21h18", "M5 21V7l8-4 8 4v14", "M9 21v-4h6v4"],
  library: ["M4 19.5v-15A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5z", "M12 6v6"],
  sports_center: ["M6.5 6.5c.55.55.9 1.27.9 2.08V19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2.42c0-.81.35-1.53.9-2.08Z", "M12 6.5c.55.55.9 1.27.9 2.08V19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2.42c0-.81.35-1.53.9-2.08Z", "M17.5 6.5c.55.55.9 1.27.9 2.08V19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2.42c0-.81.35-1.53.9-2.08Z"],
  street_market: ["M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
  community_center: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M12 11V5a4 4 0 0 1 8 0v6"],
  daycare: ["M9 12h.01", "M15 12h.01", "M9.5 9a2.5 2.5 0 0 1 5 0", "M12 3a6 6 0 0 1 6 6c0 2.5-1.5 4.5-3 5.5"],
  park: ["M12 22v-4", "M12 18a4 4 0 0 0 4-4V8a4 4 0 0 0-8 0v6a4 4 0 0 0 4 4Z", "M8 22v-4", "M8 18a4 4 0 0 0 4-4V8a4 4 0 0 0-8 0v6a4 4 0 0 0 4 4Z"],
  market: ["M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
  city_market: ["M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
  theater: ["M2 10v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10", "M2 10l10-6 10 6", "M12 2v6"],
  museum: ["M4 22h16", "M5 22V10l7.5-4 7.5 4v12", "M10 22v-6h4v6"],
  social_assistance: ["M15 11h.01", "M11 11h.01", "M12 3a6 6 0 0 1 6 6c0 2.5-1.5 4.5-3 5.5"],
  transit_station: ["M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"],
  subprefeitura: ["M4 22h16", "M5 22V12l7-4 7 4v10", "M12 8v4", "M2 12h20"],
  police_station: ["M12 2L4 6v4a8 8 0 0 0 16 0V6l-8-4z", "M12 12v6", "M10 14h4"],
  cemetery: ["M4 22h16", "M5 22V10l7.5-4 7.5 4v12", "M10 22v-8h4v8"],
  accessibility: ["M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2H9v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"],
  recycling_point: ["M7 15h10l-2-4", "M17 9l-2 4", "M5 21h14", "M12 3v4"],
  fire_station: ["M12 22c-4.97 0-9-2.58-9-7 0-4.5 4.02-8 9-8 4.97 0 9 3.5 9 8 0 4.42-4.03 7-9 7z", "M12 2v4", "M12 18v4"],
  other: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z", "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
};

export function getServiceTypeSvgPaths(serviceType: string): string[] | undefined {
  return SERVICE_TYPE_SVG_PATHS[serviceType];
}
