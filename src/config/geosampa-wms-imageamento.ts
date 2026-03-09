/**
 * Configuração e utilitários para camadas WMS (Imageamento) do GeoSampa.
 *
 * As ortofotos/fotos aéreas contínuas ficam no servidor RASTER (Articulação de Imagens).
 * Metadado: https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/por/catalog.search#/metadata/b4cc5235-6663-41aa-9d48-1de802c4d7c7
 */

export const GEOSAMPA_WMS_IMAGEAMENTO_METADATA_URL =
  "https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/por/catalog.search#/metadata/b4cc5235-6663-41aa-9d48-1de802c4d7c7";

/**
 * Base URL do WMS de imageamento (ortofotos). Usamos o servidor RASTER do GeoSampa,
 * que expõe as camadas da "Articulação de Imagens" (Ortofotos 2020, Orto 2017, Orto_MDC, etc.).
 * Em dev usa proxy Vite para evitar CORS.
 */
export const GEOSAMPA_WMS_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.DEV
    ? "/geosampa-raster-wms/geoserver/geoportal/ows"
    : "https://raster.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/ows";

/**
 * Camada WMS de ortofotos (raster contínuo). Do GetCapabilities do servidor raster:
 * - ORTO_RGB_2020 = Ortofotos 2020
 * - Orto_PMD_RGB_2017 = Ortofotos 2017
 * - Orto_MDC = ortofotos 2004 (1:1000 e 1:5000)
 * - MOSAICO_ORTO_RGB_10CM_20CM, Folhas_do_Livro_1988, SaraBrasil_1930, Vasp_Cruzeiro, Hillshade_MDC_2004
 */
export const GEOSAMPA_WMS_LAYER_IMAGEAMENTO = "ORTO_RGB_2020";

const TILE_SIZE = 256;

/**
 * Converte coordenada Y de tile (Web Mercator) em latitude (graus).
 * Google Maps: tile (x, y) no zoom z; y=0 no topo.
 */
function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * Converte coordenada X de tile (Web Mercator) em longitude (graus).
 */
function tileXToLng(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

/**
 * Gera a URL GetMap do WMS para um tile (x, y, zoom).
 * Usado pelo Google Maps ImageMapType.
 * CRS EPSG:4326; bbox = (minLon, minLat, maxLon, maxLat).
 */
export function buildWmsGetMapUrl(options: {
  baseUrl: string;
  layer: string;
  width?: number;
  height?: number;
}): (tileCoord: { x: number; y: number }, zoom: number) => string {
  const { baseUrl, layer, width = TILE_SIZE, height = TILE_SIZE } = options;
  const sep = baseUrl.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetMap",
    layers: layer,
    format: "image/png",
    transparent: "true",
    crs: "EPSG:4326",
    width: String(width),
    height: String(height),
  });

  return (tileCoord: google.maps.Point, zoom: number) => {
    const x = tileCoord.x;
    const y = tileCoord.y;
    const lonMin = tileXToLng(x, zoom);
    const lonMax = tileXToLng(x + 1, zoom);
    const latMax = tileYToLat(y, zoom);
    const latMin = tileYToLat(y + 1, zoom);
    // WMS 1.3.0 com EPSG:4326: eixos na ordem latitude, longitude (miny,minx,maxy,maxx)
    const bbox = `${latMin},${lonMin},${latMax},${lonMax}`;
    return `${baseUrl}${sep}${params.toString()}&bbox=${bbox}`;
  };
}

/** Opacidade padrão da camada de imageamento (0–1). */
export const GEOSAMPA_WMS_IMAGEAMENTO_OPACITY = 0.85;
