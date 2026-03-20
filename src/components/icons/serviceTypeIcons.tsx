/**
 * Ícones SVG por tipo de serviço público (substituição a emojis - task 2.2).
 * Usado em ServiceCard, mapas e listas. Para camada de símbolo em mapas (Mapbox/Google)
 * que exige texto, use getServiceTypeMarkerChar().
 * OS-05: Transporte com ícone SVG customizado e cor exclusiva no mapa.
 */
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  School,
  Landmark,
  BookOpen,
  Dumbbell,
  ShoppingCart,
  Users,
  Baby,
  TreePine,
  Handshake,
  Shield,
  Bus,
  Bike,
  Flame,
  Recycle,
  MapPin,
  Film,
} from "lucide-react";

export const SERVICE_TYPE_ICONS: Record<string, LucideIcon> = {
  ubs: Building2,
  school: School,
  ceu: Landmark,
  hospital: Building2,
  library: BookOpen,
  sports_center: Dumbbell,
  street_market: ShoppingCart,
  community_center: Users,
  daycare: Baby,
  park: TreePine,
  social_assistance: Handshake,
  police_station: Shield,
  transit_station: Bus,
  bicycle: Bike,
  subprefeitura: Landmark,
  market: ShoppingCart,
  city_market: ShoppingCart,
  theater: Film,
  museum: Landmark,
  cemetery: Landmark,
  accessibility: Handshake,
  recycling_point: Recycle,
  fire_station: Flame,
  other: MapPin,
};

/** Cor por tipo no mapa (OS-05: identidade visual por categoria). Cor padrão para tipos não listados. */
export const SERVICE_TYPE_MAP_COLORS: Record<string, string> = {
  transit_station: "#0D9488",
  bicycle: "#16A34A",
  subprefeitura: "#0369A1",
  ubs: "#0EA5E9",
  school: "#2563EB",
  ceu: "#7C3AED",
  hospital: "#DC2626",
  library: "#6D28D9",
  sports_center: "#16A34A",
  street_market: "#CA8A04",
  community_center: "#EA580C",
  daycare: "#DB2777",
  park: "#059669",
  market: "#B45309",
  city_market: "#92400E",
  theater: "#9333EA",
  museum: "#4F46E5",
  social_assistance: "#0D9488",
  police_station: "#1E40AF",
  cemetery: "#57534E",
  accessibility: "#0284C7",
  recycling_point: "#15803D",
  fire_station: "#DC2626",
  other: "#64748B",
};

/** Paths SVG (path d) por tipo para ícone no balão do mapa (viewBox 0 0 24 24, stroke). */
const BALLOON_ICON_PATHS: Record<string, string[]> = {
  bicycle: [
    "M18.5 18.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M5.5 18.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M12 5v6l4 2",
    "m19 8-4 2 2 4",
    "M5 10 9 8l2 4",
  ],
  transit_station: [
    "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z",
    "M7.5 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    "M16.5 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    "M6 6h12v5H6z",
  ],
  ubs: ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", "M6 12h12", "M6 8h12", "M6 16h12"],
  hospital: [
    "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",
    "M6 12h12",
    "M6 8h12",
    "M6 16h12",
    "M10 2v6h4V2",
  ],
  school: ["M4 19l5-4 5 4", "M4 14l5-4 5 4", "M4 9l8-5 8 5"],
  library: [
    "M4 19.5v-15A2.5 2.5 0 0 1 6.5 17H20",
    "M6.5 2H20v20H6.5z",
    "M12 6v6",
  ],
  sports_center: [
    "M6.5 6.5c.55.55.9 1.27.9 2.08V19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2.42c0-.81.35-1.53.9-2.08Z",
    "M12 6.5c.55.55.9 1.27.9 2.08V19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2.42c0-.81.35-1.53.9-2.08Z",
    "M17.5 6.5c.55.55.9 1.27.9 2.08V19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2.42c0-.81.35-1.53.9-2.08Z",
  ],
  street_market: [
    "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",
    "M3 6h18",
    "M16 10a4 4 0 0 1-8 0",
  ],
  community_center: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M12 11V3",
    "m4 21 8-4 8 4",
    "M18 11l-6-6-6 6",
  ],
  daycare: [
    "M12 22v-4",
    "M12 18a2 2 0 0 0 2-2V8",
    "M12 8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2",
    "M8 22v-4",
    "M8 18a2 2 0 0 0 2-2V8",
    "M8 8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2",
    "M4 12h16",
  ],
  park: [
    "M12 22v-6",
    "M12 16c-2.5 0-4.5-2-4.5-4.5V6",
    "M12 16c2.5 0 4.5-2 4.5-4.5V6",
    "M4 22h16",
    "M8 10l4-4 4 4",
  ],
  market: [
    "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",
    "M3 6h18",
    "M16 10a4 4 0 0 1-8 0",
  ],
  city_market: ["M6 2v4", "M18 2v4", "M6 22V10", "M18 22V10", "M6 10h12", "M2 6h20"],
  theater: ["M2 10v10", "M22 10v10", "M6 6v12", "M18 6v12", "M2 6h20", "M2 14h20"],
  museum: ["M4 22h16", "M5 22V12l7-4 7 4v10", "M12 8v4", "M2 12h20"],
  social_assistance: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M12 11v10",
    "M8 21h8",
    "M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  ],
  subprefeitura: [
    "M4 22h16",
    "M5 22V12l7-4 7 4v10",
    "M12 8v4",
    "M2 12h20",
  ],
  police_station: [
    "M12 2v4",
    "M12 18v4",
    "M4 12H2",
    "M22 12h-2",
    "M12 6a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0v-4a4 4 0 0 0-4-4Z",
    "M6 8V6",
    "M18 8V6",
  ],
  cemetery: ["M12 2v20", "M8 22h8", "M6 12l6-6 6 6", "M4 22v-4", "M20 22v-4"],
  accessibility: [
    "M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    "M12 8v14",
    "M8 14l4 4 4-4",
    "M9 10h6",
  ],
  recycling_point: ["M7 15h10l2-6-4 2-2-4-4 2-2 6z", "M5 12 3 18l6-2 2-4", "M19 12l2 6-6-2-2-4"],
  fire_station: [
    "M12 22c-4.97 0-9-2.58-9-7 0-4.5 4.02-8 9-8 4.97 0 9 3.5 9 8 0 4.42-4.03 7-9 7z",
    "M12 2v4",
    "M12 18v4",
  ],
  ceu: ["M3 21h18", "M5 21V7l8-4 8 4v14", "M9 21v-4h6v4"],
  other: [
    "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z",
    "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  ],
};

/** Label por tipo para a legenda do mapa. */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  ubs: "UBS",
  school: "Escolas",
  ceu: "CEUs",
  hospital: "Hospitais",
  library: "Bibliotecas",
  sports_center: "Esportes",
  street_market: "Feiras",
  community_center: "Centros Comunitários",
  daycare: "Creches",
  park: "Parques",
  market: "Mercados",
  city_market: "Mercados Municipais",
  theater: "Teatro/Cinema",
  museum: "Museus",
  social_assistance: "Assistência Social",
  transit_station: "Transporte",
  bicycle: "Bicicletários",
  subprefeitura: "Subprefeituras",
  police_station: "Delegacia/Polícia",
  cemetery: "Cemitério",
  accessibility: "Acessibilidade",
  recycling_point: "Reciclagem/Limpeza",
  fire_station: "Bombeiros",
  other: "Outros",
};

export function getServiceTypeLabel(serviceType: string): string {
  return SERVICE_TYPE_LABELS[serviceType] ?? serviceType;
}

export function getServiceTypeMapColor(serviceType: string): string | undefined {
  return SERVICE_TYPE_MAP_COLORS[serviceType];
}

const DEFAULT_MAP_COLOR = "#64748B";

/**
 * Gera data URL de um ícone no estilo "balão" para uso em marcadores do Google Maps.
 * Todos os tipos usam ícone SVG + cor (OS-05: sem emoji).
 */
export function getServiceTypeBalloonIconUrl(serviceType: string): string {
  const size = 40;
  const r = 18;
  const color = getServiceTypeMapColor(serviceType) ?? DEFAULT_MAP_COLOR;
  const paths = BALLOON_ICON_PATHS[serviceType] ?? BALLOON_ICON_PATHS.other;
  const fillLight = serviceType === "transit_station" ? "#CCFBF1" : "#fff";
  const pathsSvg = paths
    .map(
      (d) =>
        `<path fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`
    )
    .join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${fillLight}" stroke="${color}" stroke-width="2"/><g transform="translate(8,8) scale(0.67)" fill="none">${pathsSvg}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Caractere/emoji usado nos marcadores do mapa (Mapbox/Google).
 * As camadas de símbolo aceitam texto; usamos emoji por tipo para distinguir serviços no mapa.
 * Nos cards e listas ao lado do mapa continuamos usando ícones SVG (ServiceTypeIcon).
 */
export function getServiceTypeMarkerChar(serviceType: string): string {
  const markers: Record<string, string> = {
    ubs: "🏥",
    school: "🏫",
    ceu: "🎭",
    hospital: "🏥",
    library: "📚",
    sports_center: "⚽",
    street_market: "🛒",
    community_center: "🏘️",
    daycare: "🍼",
    park: "🌳",
    social_assistance: "🤝",
    police_station: "🚔",
    transit_station: "🚌",
    bicycle: "🚲",
    subprefeitura: "🏛️",
    market: "🛒",
    city_market: "🏪",
    theater: "🎬",
    museum: "🏛️",
    cemetery: "🪦",
    accessibility: "♿",
    recycling_point: "♻️",
    fire_station: "🚒",
    other: "📍",
  };
  return markers[serviceType] ?? "📍";
}
