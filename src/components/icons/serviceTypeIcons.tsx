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

/** Cor exclusiva por tipo no mapa (OS-05: identidade visual por categoria). */
export const SERVICE_TYPE_MAP_COLORS: Record<string, string> = {
  transit_station: "#0D9488", // teal-600 – Transporte (ônibus/terminais)
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

/** Ícone SVG customizado para Transporte (ônibus) – reconhecível em zoom reduzido. */
const TRANSIT_BUS_SVG_PATH =
  "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z";

/**
 * Gera data URL de um ícone no estilo "balão" para uso em marcadores do Google Maps.
 * Transporte (transit_station): SVG customizado + cor exclusiva; demais: emoji no círculo.
 */
export function getServiceTypeBalloonIconUrl(serviceType: string): string {
  const size = 40;
  const r = 18;
  const color = getServiceTypeMapColor(serviceType);
  const isTransit = serviceType === "transit_station";

  if (isTransit && color) {
    const fillLight = "#CCFBF1";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${fillLight}" stroke="${color}" stroke-width="2"/>
  <g transform="translate(14,14) scale(0.5)">
    <path fill="${color}" d="${TRANSIT_BUS_SVG_PATH}"/>
  </g>
</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  const emoji = getServiceTypeMarkerChar(serviceType);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff" stroke="#94a3b8" stroke-width="2"/>
  <text x="${size / 2}" y="${size / 2 + 6}" text-anchor="middle" font-size="20" font-family="Arial,sans-serif">${emoji}</text>
</svg>`;
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
