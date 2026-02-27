/**
 * Configuração das camadas overlay do GeoSampa (WFS GeoJSON).
 * Usadas para exibir polígonos/linhas no mapa (distritos, subprefeituras, ciclovias, etc).
 *
 * WFS base: https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs
 *
 * CORS: GeoSampa não envia Access-Control-Allow-Origin.
 * - Dev: proxy Vite (/geosampa-wfs)
 * - Prod: Edge Function geosampa-wfs-proxy (via VITE_SUPABASE_URL)
 */
const WFS_ORIGIN = "https://wfs.geosampa.prefeitura.sp.gov.br";
const WFS_QUERY =
  "service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&srsName=EPSG:4326";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const customProxy = import.meta.env.VITE_GEOSAMPA_WFS_PROXY as string | undefined;

/** Proxy em prod: Edge Function ou custom env */
const prodProxyBase = customProxy
  ? customProxy.replace(/\/?$/, "")
  : supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/geosampa-wfs-proxy`
    : null;

/** Em dev usa proxy Vite; em prod usa Edge Function (ou custom) para evitar CORS */
const WFS_BASE =
  import.meta.env.DEV
    ? `/geosampa-wfs/geoserver/geoportal/wfs?${WFS_QUERY}`
    : prodProxyBase
      ? `${prodProxyBase}?${WFS_QUERY}`
      : `${WFS_ORIGIN}/geoserver/geoportal/wfs?${WFS_QUERY}`;

export interface GeoSampaOverlayLayer {
  id: string;
  typeName: string;
  label: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWeight?: number;
  fillOpacity?: number;
  maxFeatures?: number;
}

export const GEOSAMPA_OVERLAY_LAYERS: GeoSampaOverlayLayer[] = [
  // Limites administrativos
  {
    id: "distrito",
    typeName: "distrito_municipal",
    label: "Distritos",
    fillColor: "#3b82f6",
    fillOpacity: 0.08,
    strokeColor: "#1d4ed8",
    strokeWeight: 1.5,
    maxFeatures: 100,
  },
  {
    id: "subprefeitura",
    typeName: "subprefeitura",
    label: "Subprefeituras",
    fillColor: "#059669",
    fillOpacity: 0.06,
    strokeColor: "#047857",
    strokeWeight: 2,
    maxFeatures: 35,
  },
  // Transporte / mobilidade
  {
    id: "via_bicicleta",
    typeName: "via_bicicleta",
    label: "Ciclovias",
    strokeColor: "#eab308",
    strokeWeight: 3,
    fillColor: "transparent",
    maxFeatures: 500,
  },
  {
    id: "linha_metro",
    typeName: "linha_metro",
    label: "Linhas de Metrô",
    strokeColor: "#dc2626",
    strokeWeight: 3,
    fillColor: "transparent",
    maxFeatures: 50,
  },
  {
    id: "linha_trem",
    typeName: "linha_trem",
    label: "Linhas de Trem/CPTM",
    strokeColor: "#7c3aed",
    strokeWeight: 2.5,
    fillColor: "transparent",
    maxFeatures: 50,
  },
  {
    id: "corredor_onibus",
    typeName: "corredor_onibus",
    label: "Corredores de Ônibus",
    strokeColor: "#ea580c",
    strokeWeight: 2,
    fillColor: "transparent",
    maxFeatures: 100,
  },
  // Verde e meio ambiente
  {
    id: "parque_unidade_conservacao",
    typeName: "GEOSAMPA_cadparcs_parque_unidade_conservacao",
    label: "Parques e Unidades de Conservação",
    fillColor: "#16a34a",
    fillOpacity: 0.2,
    strokeColor: "#15803d",
    strokeWeight: 1.5,
    maxFeatures: 200,
  },
  {
    id: "praca_largo",
    typeName: "GEOSAMPA_v_praca_largo",
    label: "Praças e Largos",
    fillColor: "#22c55e",
    fillOpacity: 0.15,
    strokeColor: "#16a34a",
    strokeWeight: 1,
    maxFeatures: 500,
  },
  {
    id: "apa",
    typeName: "GEOSAMPA_cadparcs_area_protecao_apa",
    label: "Áreas de Proteção Ambiental (APA)",
    fillColor: "#065f46",
    fillOpacity: 0.12,
    strokeColor: "#047857",
    strokeWeight: 1.5,
    maxFeatures: 50,
  },
  {
    id: "cobertura_vegetal",
    typeName: "cobertura_vegetal",
    label: "Cobertura Vegetal",
    fillColor: "#166534",
    fillOpacity: 0.2,
    strokeColor: "#14532d",
    strokeWeight: 1,
    maxFeatures: 300,
  },
  {
    id: "vegetacao_significativa",
    typeName: "GEOSAMPA_v_cgpabi_vegetacao_significativa",
    label: "Vegetação Significativa",
    fillColor: "#15803d",
    fillOpacity: 0.25,
    strokeColor: "#166534",
    strokeWeight: 1,
    maxFeatures: 200,
  },
  // Patrimônio cultural
  {
    id: "bem_tombado",
    typeName: "patrimonio_cultural_bem_tombado",
    label: "Patrimônio – Bem Tombado",
    fillColor: "#b45309",
    fillOpacity: 0.15,
    strokeColor: "#92400e",
    strokeWeight: 1.5,
    maxFeatures: 200,
  },
  // Água e drenagem
  {
    id: "bacia_hidrografica",
    typeName: "bacia_hidrografica",
    label: "Bacias Hidrográficas",
    fillColor: "#0ea5e9",
    fillOpacity: 0.1,
    strokeColor: "#0284c7",
    strokeWeight: 1.5,
    maxFeatures: 50,
  },
  {
    id: "mancha_inundacao_5",
    typeName: "mancha_inundacao_5",
    label: "Mancha de Inundação (5 anos)",
    fillColor: "#6366f1",
    fillOpacity: 0.2,
    strokeColor: "#4f46e5",
    strokeWeight: 1,
    maxFeatures: 100,
  },
  {
    id: "massa_d_agua",
    typeName: "massa_d_agua",
    label: "Massas d'água",
    fillColor: "#38bdf8",
    fillOpacity: 0.4,
    strokeColor: "#0ea5e9",
    strokeWeight: 1.5,
    maxFeatures: 100,
  },
  // População e habitação
  {
    id: "setor_censitario",
    typeName: "setor_censitario_2022",
    label: "Setores Censitários",
    fillColor: "#a855f7",
    fillOpacity: 0.06,
    strokeColor: "#9333ea",
    strokeWeight: 0.5,
    maxFeatures: 200,
  },
  {
    id: "favela",
    typeName: "geohabisp_vw_wfs_favela_geosampa",
    label: "Favelas",
    fillColor: "#991b1b",
    fillOpacity: 0.15,
    strokeColor: "#b91c1c",
    strokeWeight: 1,
    maxFeatures: 200,
  },
  {
    id: "nucleo",
    typeName: "geohabisp_vw_wfs_nucleo_geosampa",
    label: "Núcleos Habitacionais",
    fillColor: "#c2410c",
    fillOpacity: 0.12,
    strokeColor: "#ea580c",
    strokeWeight: 1,
    maxFeatures: 150,
  },
  // Operações urbanas
  {
    id: "operacao_urbana",
    typeName: "operacao_urbana",
    label: "Operações Urbanas",
    fillColor: "#7c2d12",
    fillOpacity: 0.1,
    strokeColor: "#9a3412",
    strokeWeight: 2,
    maxFeatures: 50,
  },
];

export function buildWfsUrl(layer: GeoSampaOverlayLayer): string {
  const max = layer.maxFeatures ?? 500;
  const sep = WFS_BASE.includes("?") ? "&" : "?";
  return `${WFS_BASE}${sep}typeName=geoportal:${layer.typeName}&maxFeatures=${max}`;
}
