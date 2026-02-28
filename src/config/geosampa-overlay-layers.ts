/**
 * Configuração das camadas overlay do GeoSampa (WFS GeoJSON).
 * Usadas para exibir polígonos/linhas no mapa (distritos, subprefeituras, ciclovias, etc).
 *
 * WFS base: https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs
 *
 * CORS: GeoSampa não envia Access-Control-Allow-Origin.
 * - Dev: proxy Vite (/geosampa-wfs)
 * - Prod: Edge Function geosampa-wfs-proxy (via CAMARA_URL ou VITE_SUPABASE_URL)
 */
const WFS_ORIGIN = "https://wfs.geosampa.prefeitura.sp.gov.br";
const WFS_QUERY =
  "service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&srsName=EPSG:4326";

const supabaseUrl = (import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL) as string | undefined;
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
    id: "mancha_inundacao_25",
    typeName: "mancha_inundacao_25",
    label: "Mancha de Inundação (25 anos)",
    fillColor: "#4f46e5",
    fillOpacity: 0.18,
    strokeColor: "#4338ca",
    strokeWeight: 1,
    maxFeatures: 100,
  },
  {
    id: "mancha_inundacao_100",
    typeName: "mancha_inundacao_100",
    label: "Mancha de Inundação (100 anos)",
    fillColor: "#3730a3",
    fillOpacity: 0.15,
    strokeColor: "#312e81",
    strokeWeight: 1,
    maxFeatures: 100,
  },
  // Proteção e Defesa Civil – Áreas de risco e ocorrências
  {
    id: "area_risco_geologico",
    typeName: "area_risco_geologico",
    label: "Risco Geológico",
    fillColor: "#78350f",
    fillOpacity: 0.25,
    strokeColor: "#a16207",
    strokeWeight: 1.5,
    maxFeatures: 200,
  },
  {
    id: "risco_hidrologico",
    typeName: "risco_hidrologico",
    label: "Risco Hidrológico",
    fillColor: "#0369a1",
    fillOpacity: 0.2,
    strokeColor: "#0284c7",
    strokeWeight: 1.5,
    maxFeatures: 200,
  },
  {
    id: "risco_ocorrencia_alagamento",
    typeName: "risco_ocorrencia_alagamento",
    label: "Ocorrências – Alagamento",
    fillColor: "#0ea5e9",
    fillOpacity: 0.25,
    strokeColor: "#0284c7",
    strokeWeight: 1,
    maxFeatures: 300,
  },
  {
    id: "risco_ocorrencia_inundacao",
    typeName: "risco_ocorrencia_inundacao",
    label: "Ocorrências – Inundação",
    fillColor: "#38bdf8",
    fillOpacity: 0.22,
    strokeColor: "#0ea5e9",
    strokeWeight: 1,
    maxFeatures: 300,
  },
  {
    id: "risco_ocorrencia_deslizamento",
    typeName: "risco_ocorrencia_deslizamento",
    label: "Ocorrências – Deslizamento",
    fillColor: "#991b1b",
    fillOpacity: 0.2,
    strokeColor: "#b91c1c",
    strokeWeight: 1,
    maxFeatures: 200,
  },
  {
    id: "risco_ocorrencia_risco_deslizamento",
    typeName: "risco_ocorrencia_risco_deslizamento",
    label: "Ocorrências – Risco de Deslizamento",
    fillColor: "#dc2626",
    fillOpacity: 0.18,
    strokeColor: "#ef4444",
    strokeWeight: 1,
    maxFeatures: 200,
  },
  {
    id: "risco_ocorrencia_queda_arvore",
    typeName: "risco_ocorrencia_queda_arvore",
    label: "Ocorrências – Queda de Árvore",
    fillColor: "#166534",
    fillOpacity: 0.2,
    strokeColor: "#15803d",
    strokeWeight: 1,
    maxFeatures: 300,
  },
  {
    id: "pluviometro",
    typeName: "pluviometro",
    label: "Pluviômetros",
    fillColor: "#0891b2",
    fillOpacity: 0.3,
    strokeColor: "#0e7490",
    strokeWeight: 1.5,
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
  // Legislação Urbana
  // Zoneamento (LPUOS)
  {
    id: "zoneamento_2016",
    typeName: "zoneamento_2016_map1",
    label: "Zoneamento 2016 (LPUOS)",
    fillColor: "#6b7280",
    fillOpacity: 0.12,
    strokeColor: "#4b5563",
    strokeWeight: 1,
    maxFeatures: 500,
  },
  {
    id: "zoneamento_classificacao_viaria",
    typeName: "zoneamento_classificacao_viaria",
    label: "Zoneamento – Classificação Viária",
    fillColor: "#78716c",
    fillOpacity: 0.1,
    strokeColor: "#57534e",
    strokeWeight: 1,
    maxFeatures: 300,
  },
  {
    id: "zoneamento_corredor_uso",
    typeName: "zoneamento_corredor_uso",
    label: "Zoneamento – Corredor de Uso",
    fillColor: "#71717a",
    fillOpacity: 0.1,
    strokeColor: "#52525b",
    strokeWeight: 1,
    maxFeatures: 200,
  },
  {
    id: "zoneamento_geoambiental",
    typeName: "GEOSAMPA_zoneamento_geoambiental_apa_cm",
    label: "Zoneamento Geoambiental APA/CM",
    fillColor: "#166534",
    fillOpacity: 0.15,
    strokeColor: "#14532d",
    strokeWeight: 1,
    maxFeatures: 100,
  },
  {
    id: "zoneamento_revogado_lei13885",
    typeName: "perimetro_zoneamento_revogado_lei13885",
    label: "Zoneamento Revogado (Lei 13.885/04)",
    fillColor: "#991b1b",
    fillOpacity: 0.08,
    strokeColor: "#b91c1c",
    strokeWeight: 1,
    maxFeatures: 100,
  },
  // PDE (Plano Diretor)
  {
    id: "pde_zeis",
    typeName: "pde2014_v_zeis_04_map",
    label: "PDE – ZEIS (Zonas Especiais)",
    fillColor: "#a16207",
    fillOpacity: 0.15,
    strokeColor: "#ca8a04",
    strokeWeight: 1,
    maxFeatures: 200,
  },
  {
    id: "pde_macroarea",
    typeName: "pde2014_v_mcrar_02_map",
    label: "PDE – Macroáreas",
    fillColor: "#6366f1",
    fillOpacity: 0.1,
    strokeColor: "#4f46e5",
    strokeWeight: 1,
    maxFeatures: 50,
  },
  {
    id: "plano_acao_regional",
    typeName: "plano_acao_regional",
    label: "Planos Regionais – Ação Regional",
    fillColor: "#7c3aed",
    fillOpacity: 0.1,
    strokeColor: "#6d28d9",
    strokeWeight: 1.5,
    maxFeatures: 100,
  },
  {
    id: "plano_macro_regional",
    typeName: "plano_macro_regional",
    label: "Planos Regionais – Macro Regional",
    fillColor: "#9333ea",
    fillOpacity: 0.08,
    strokeColor: "#7e22ce",
    strokeWeight: 1.5,
    maxFeatures: 50,
  },
  // Operações Urbanas
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
  {
    id: "subsetor_operacao_urbana",
    typeName: "subsetor_operacao_urbana",
    label: "Setores / Subsetores Operação Urbana",
    fillColor: "#9a3412",
    fillOpacity: 0.12,
    strokeColor: "#c2410c",
    strokeWeight: 1.5,
    maxFeatures: 100,
  },
  {
    id: "oucfl_area_influencia",
    typeName: "oucfl_area_influencia",
    label: "Áreas de Influência OUC Faria Lima",
    fillColor: "#b45309",
    fillOpacity: 0.12,
    strokeColor: "#d97706",
    strokeWeight: 1.5,
    maxFeatures: 50,
  },
  // AIU (Áreas de Intervenção Urbana)
  {
    id: "perimetro_aiu",
    typeName: "perimetro_aiu",
    label: "AIU – Perímetro Geral (Setor Central e demais)",
    fillColor: "#0d9488",
    fillOpacity: 0.1,
    strokeColor: "#0f766e",
    strokeWeight: 2,
    maxFeatures: 50,
  },
  {
    id: "perimetro_especial_aiu",
    typeName: "perimetro_especial_aiu",
    label: "AIU – Perímetro Especial",
    fillColor: "#14b8a6",
    fillOpacity: 0.1,
    strokeColor: "#0d9488",
    strokeWeight: 1.5,
    maxFeatures: 50,
  },
  {
    id: "aiu_vila_leopoldina",
    typeName: "aiu_vl_perimetro_adesao",
    label: "AIU Vila Leopoldina – Perímetro Adesão",
    fillColor: "#0f766e",
    fillOpacity: 0.12,
    strokeColor: "#115e59",
    strokeWeight: 1.5,
    maxFeatures: 100,
  },
  {
    id: "aiu_jurubatuba",
    typeName: "aiu_perimetro_jurubatuba",
    label: "AIU Arco Jurubatuba",
    fillColor: "#0891b2",
    fillOpacity: 0.1,
    strokeColor: "#0e7490",
    strokeWeight: 1.5,
    maxFeatures: 50,
  },
  {
    id: "aiu_pinheiros",
    typeName: "aiu_perimetro_pinheiros",
    label: "AIU Arco Pinheiros",
    fillColor: "#06b6d4",
    fillOpacity: 0.1,
    strokeColor: "#0891b2",
    strokeWeight: 1.5,
    maxFeatures: 50,
  },
  // Requalifica Centro
  {
    id: "requalifica_centro",
    typeName: "requalifica_centro_perimetro_geral",
    label: "Requalifica Centro (Lei 17.577/21)",
    fillColor: "#4f46e5",
    fillOpacity: 0.12,
    strokeColor: "#4338ca",
    strokeWeight: 2,
    maxFeatures: 50,
  },
  // Instrumentos urbanísticos
  {
    id: "outorga_onerosa",
    typeName: "outorga_onerosa",
    label: "Outorga Onerosa",
    fillColor: "#ea580c",
    fillOpacity: 0.15,
    strokeColor: "#c2410c",
    strokeWeight: 1,
    maxFeatures: 200,
  },
  {
    id: "imovel_notificado",
    typeName: "imovel_notificado",
    label: "Imóveis Notificados – Função Social",
    fillColor: "#16a34a",
    fillOpacity: 0.2,
    strokeColor: "#15803d",
    strokeWeight: 1,
    maxFeatures: 300,
  },
  {
    id: "restricao_geotecnica",
    typeName: "restricao_geotecnica",
    label: "Áreas com Restrições Geotécnicas",
    fillColor: "#78350f",
    fillOpacity: 0.15,
    strokeColor: "#a16207",
    strokeWeight: 1,
    maxFeatures: 200,
  },
];

export function buildWfsUrl(layer: GeoSampaOverlayLayer): string {
  const max = layer.maxFeatures ?? 500;
  const sep = WFS_BASE.includes("?") ? "&" : "?";
  return `${WFS_BASE}${sep}typeName=geoportal:${layer.typeName}&maxFeatures=${max}`;
}
