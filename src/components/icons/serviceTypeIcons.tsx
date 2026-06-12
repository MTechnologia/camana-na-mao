/**
 * Ícones SVG por tipo de serviço público (substituição a emojis - task 2.2).
 * Usado em ServiceCard, mapas e listas. Para camada de símbolo em mapas (Mapbox/Google)
 * que exige texto, use getServiceTypeMarkerChar().
 * OS-05: Transporte com ícone SVG customizado e cor exclusiva no mapa.
 */
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Building,
  School,
  Landmark,
  BookOpen,
  Dumbbell,
  ShoppingCart,
  ShoppingBag,
  Store,
  GraduationCap,
  Church,
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
  ceu: GraduationCap,
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
  market: Store,
  city_market: ShoppingBag,
  theater: Film,
  museum: Building,
  cemetery: Church,
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

/**
 * Primitivas SVG espelhando lucide-react (mesmos traços que ServiceTypeIcon).
 * Fonte: node_modules/lucide-react/dist/esm/icons/*.js (v0.462).
 */
type BalloonLucideShape =
  | { tag: "path"; d: string }
  | { tag: "circle"; cx: string; cy: string; r: string }
  | { tag: "line"; x1: string; y1: string; x2: string; y2: string }
  | { tag: "polygon"; points: string }
  | { tag: "rect"; x: string; y: string; width: string; height: string; rx?: string };

const BALLOON_LUCIDE_SHAPES: Record<string, BalloonLucideShape[]> = {
  building2: [
    { tag: "path", d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" },
    { tag: "path", d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" },
    { tag: "path", d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" },
    { tag: "path", d: "M10 6h4" },
    { tag: "path", d: "M10 10h4" },
    { tag: "path", d: "M10 14h4" },
    { tag: "path", d: "M10 18h4" },
  ],
  landmark: [
    { tag: "line", x1: "3", y1: "22", x2: "21", y2: "22" },
    { tag: "line", x1: "6", y1: "18", x2: "6", y2: "11" },
    { tag: "line", x1: "10", y1: "18", x2: "10", y2: "11" },
    { tag: "line", x1: "14", y1: "18", x2: "14", y2: "11" },
    { tag: "line", x1: "18", y1: "18", x2: "18", y2: "11" },
    { tag: "polygon", points: "12 2 20 7 4 7" },
  ],
  bookOpen: [
    { tag: "path", d: "M12 7v14" },
    {
      tag: "path",
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
    },
  ],
  school: [
    { tag: "path", d: "M14 22v-4a2 2 0 1 0-4 0v4" },
    {
      tag: "path",
      d: "m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10",
    },
    { tag: "path", d: "M18 5v17" },
    { tag: "path", d: "m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6" },
    { tag: "path", d: "M6 5v17" },
    { tag: "circle", cx: "12", cy: "9", r: "2" },
  ],
  dumbbell: [
    { tag: "path", d: "M14.4 14.4 9.6 9.6" },
    {
      tag: "path",
      d: "M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z",
    },
    { tag: "path", d: "m21.5 21.5-1.4-1.4" },
    { tag: "path", d: "M3.9 3.9 2.5 2.5" },
    {
      tag: "path",
      d: "M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z",
    },
  ],
  shoppingCart: [
    { tag: "circle", cx: "8", cy: "21", r: "1" },
    { tag: "circle", cx: "19", cy: "21", r: "1" },
    {
      tag: "path",
      d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",
    },
  ],
  users: [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "M22 21v-2a4 4 0 0 0-3-3.87" },
    { tag: "path", d: "M16 3.13a4 4 0 0 1 0 7.75" },
  ],
  baby: [
    { tag: "path", d: "M9 12h.01" },
    { tag: "path", d: "M15 12h.01" },
    { tag: "path", d: "M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" },
    {
      tag: "path",
      d: "M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1",
    },
  ],
  treePine: [
    {
      tag: "path",
      d: "m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z",
    },
    { tag: "path", d: "M12 22v-3" },
  ],
  handshake: [
    { tag: "path", d: "m11 17 2 2a1 1 0 1 0 3-3" },
    {
      tag: "path",
      d: "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",
    },
    { tag: "path", d: "m21 3 1 11h-2" },
    { tag: "path", d: "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" },
    { tag: "path", d: "M3 4h8" },
  ],
  shield: [
    {
      tag: "path",
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
    },
  ],
  bus: [
    { tag: "path", d: "M8 6v6" },
    { tag: "path", d: "M15 6v6" },
    { tag: "path", d: "M2 12h19.6" },
    {
      tag: "path",
      d: "M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3",
    },
    { tag: "circle", cx: "7", cy: "18", r: "2" },
    { tag: "path", d: "M9 18h5" },
    { tag: "circle", cx: "16", cy: "18", r: "2" },
  ],
  bike: [
    { tag: "circle", cx: "18.5", cy: "17.5", r: "3.5" },
    { tag: "circle", cx: "5.5", cy: "17.5", r: "3.5" },
    { tag: "circle", cx: "15", cy: "5", r: "1" },
    { tag: "path", d: "M12 17.5V14l-3-3 4-3 2 3h2" },
  ],
  flame: [
    {
      tag: "path",
      d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
    },
  ],
  recycle: [
    {
      tag: "path",
      d: "M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5",
    },
    {
      tag: "path",
      d: "M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12",
    },
    { tag: "path", d: "m14 16-3 3 3 3" },
    { tag: "path", d: "M8.293 13.596 7.196 9.5 3.1 10.598" },
    {
      tag: "path",
      d: "m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843",
    },
    { tag: "path", d: "m13.378 9.633 4.096 1.098 1.097-4.096" },
  ],
  mapPin: [
    {
      tag: "path",
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
    },
    { tag: "circle", cx: "12", cy: "10", r: "3" },
  ],
  film: [
    { tag: "rect", x: "3", y: "3", width: "18", height: "18", rx: "2" },
    { tag: "path", d: "M7 3v18" },
    { tag: "path", d: "M3 7.5h4" },
    { tag: "path", d: "M3 12h18" },
    { tag: "path", d: "M3 16.5h4" },
    { tag: "path", d: "M17 3v18" },
    { tag: "path", d: "M17 7.5h4" },
    { tag: "path", d: "M17 16.5h4" },
  ],
  store: [
    { tag: "path", d: "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" },
    { tag: "path", d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" },
    { tag: "path", d: "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" },
    { tag: "path", d: "M2 7h20" },
    {
      tag: "path",
      d: "M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7",
    },
  ],
  shoppingBag: [
    { tag: "path", d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" },
    { tag: "path", d: "M3 6h18" },
    { tag: "path", d: "M16 10a4 4 0 0 1-8 0" },
  ],
  graduationCap: [
    {
      tag: "path",
      d: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
    },
    { tag: "path", d: "M22 10v6" },
    { tag: "path", d: "M6 12.5V16a6 3 0 0 0 12 0v-3.5" },
  ],
  building: [
    { tag: "rect", x: "4", y: "2", width: "16", height: "20", rx: "2" },
    { tag: "path", d: "M9 22v-4h6v4" },
    { tag: "path", d: "M8 6h.01" },
    { tag: "path", d: "M16 6h.01" },
    { tag: "path", d: "M12 6h.01" },
    { tag: "path", d: "M12 10h.01" },
    { tag: "path", d: "M12 14h.01" },
    { tag: "path", d: "M16 10h.01" },
    { tag: "path", d: "M16 14h.01" },
    { tag: "path", d: "M8 10h.01" },
    { tag: "path", d: "M8 14h.01" },
  ],
  church: [
    { tag: "path", d: "M10 9h4" },
    { tag: "path", d: "M12 7v5" },
    { tag: "path", d: "M14 22v-4a2 2 0 0 0-4 0v4" },
    {
      tag: "path",
      d: "M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22",
    },
    {
      tag: "path",
      d: "m18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.618a1 1 0 0 1 .553-.894L6 7",
    },
  ],
};

/** Mesma chave que o componente Lucide em SERVICE_TYPE_ICONS. */
const SERVICE_TYPE_BALLOON_LUCIDE_KEY: Record<string, keyof typeof BALLOON_LUCIDE_SHAPES> = {
  ubs: "building2",
  hospital: "building2",
  school: "school",
  ceu: "graduationCap",
  library: "bookOpen",
  sports_center: "dumbbell",
  street_market: "shoppingCart",
  community_center: "users",
  daycare: "baby",
  park: "treePine",
  social_assistance: "handshake",
  police_station: "shield",
  transit_station: "bus",
  bicycle: "bike",
  subprefeitura: "landmark",
  market: "store",
  city_market: "shoppingBag",
  theater: "film",
  museum: "building",
  cemetery: "church",
  accessibility: "handshake",
  recycling_point: "recycle",
  fire_station: "flame",
  other: "mapPin",
};

function renderBalloonLucideShapes(
  shapes: BalloonLucideShape[],
  color: string,
  strokeWidth: string,
): string {
  const cap = "round";
  const join = "round";
  return shapes
    .map((s) => {
      switch (s.tag) {
        case "path":
          return `<path fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="${cap}" stroke-linejoin="${join}" d="${s.d}"/>`;
        case "circle":
          return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        case "line":
          return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="${cap}"/>`;
        case "polygon":
          return `<polygon points="${s.points}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="${cap}" stroke-linejoin="${join}"/>`;
        case "rect":
          return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.rx ?? "0"}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
        default:
          return "";
      }
    })
    .join("");
}

function getBalloonShapesForServiceType(serviceType: string): BalloonLucideShape[] {
  const key = SERVICE_TYPE_BALLOON_LUCIDE_KEY[serviceType];
  if (key) return BALLOON_LUCIDE_SHAPES[key];
  return BALLOON_LUCIDE_SHAPES.mapPin;
}

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

/** Tamanho e âncora (ponta do pin) para marcadores de equipamento no Google Maps */
export const SERVICE_BALLOON_MARKER_LAYOUT = {
  width: 56,
  height: 66,
  anchorX: 28,
  anchorY: 62,
} as const;

/**
 * Gera data URL de um ícone em formato de **pin** para uso em marcadores do Google Maps.
 * Sombra suave, cabeça clara e traço do pictograma na cor do tipo (OS-05: sem emoji).
 */
export function getServiceTypeBalloonIconUrl(serviceType: string): string {
  const w = 48;
  const h = 56;
  const cx = w / 2;
  const color = getServiceTypeMapColor(serviceType) ?? DEFAULT_MAP_COLOR;
  const shapes = getBalloonShapesForServiceType(serviceType);
  const fillLight = serviceType === "transit_station" ? "#f0fdfa" : "#ffffff";
  const pathsSvg = renderBalloonLucideShapes(shapes, color, "2.35");
  /** Id estável por tipo (válido em XML) para o filtro SVG */
  const uid = serviceType.replace(/[^a-zA-Z0-9_-]/g, "-") || "type";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="svcPinSh-${uid}" x="-45%" y="-45%" width="190%" height="190%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#000000" flood-opacity="0.24"/>
    </filter>
  </defs>
  <g filter="url(#svcPinSh-${uid})">
    <path
      d="M24 3.5C15.99 3.5 10 9.15 10 16.25c0 5.65 5.22 14.35 12.65 24.45a1.35 1.35 0 0 0 2.28.05C32.86 30.2 38 21.55 38 16.25 38 9.15 32.01 3.5 24 3.5z"
      fill="${color}"
      stroke="#ffffff"
      stroke-width="2.25"
      stroke-linejoin="round"
    />
    <circle cx="${cx}" cy="16.5" r="10.75" fill="${fillLight}" stroke="#ffffff" stroke-width="1.75"/>
  </g>
  <g transform="translate(9.25, 3.75) scale(1.05)" fill="none">${pathsSvg}</g>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
