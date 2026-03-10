/**
 * Ícones SVG por tipo de serviço público (substituição a emojis - task 2.2).
 * Usado em ServiceCard, mapas e listas. Para camada de símbolo em mapas (Mapbox/Google)
 * que exige texto, use getServiceTypeMarkerChar().
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

/**
 * Gera data URL de um ícone no estilo "balão" (redondo, menor) para uso em marcadores do Google Maps.
 * Retorna um SVG com círculo arredondado e o emoji centralizado.
 */
export function getServiceTypeBalloonIconUrl(serviceType: string): string {
  const emoji = getServiceTypeMarkerChar(serviceType);
  const size = 40;
  const r = 18;
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
