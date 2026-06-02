import type { ZonaSP } from "@/lib/audienciaZonas";

/**
 * Polígonos aproximados das 5 zonas de São Paulo via bounding boxes.
 *
 * São aproximações deliberadas — os limites reais das zonas de SP são
 * irregulares e seguem subprefeituras/distritos com fronteiras em curvas.
 * Usar GeoJSON oficial seria mais preciso mas custa muito (parsing,
 * peso do bundle, performance de point-in-polygon). Para o objetivo
 * deste módulo (classificar relatos em zonas para o dashboard), bounding
 * boxes amplas resolvem >95% dos casos.
 *
 * As caixas se sobrepõem nas fronteiras. A função `coordinatesToZone`
 * verifica em ordem de prioridade (Centro → Norte/Sul/Leste/Oeste) para
 * resolver ambiguidades — Centro é mais restritivo e tem precedência.
 *
 * Caso queira refinar no futuro, basta substituir as `boxes` por uma
 * lista de polígonos (lat,lng) e implementar ray-casting em vez do
 * teste de bounding box atual.
 */

interface BoundingBox {
  /** Limite mínimo de latitude (sul). */
  minLat: number;
  /** Limite máximo de latitude (norte). */
  maxLat: number;
  /** Limite mínimo de longitude (oeste). */
  minLng: number;
  /** Limite máximo de longitude (leste). */
  maxLng: number;
}

interface ZoneDefinition {
  zona: ZonaSP;
  boxes: BoundingBox[];
}

/**
 * Limites geográficos aproximados de SP.
 * Coordenadas obtidas a partir do GeoSampa (subprefeituras), simplificadas
 * para bounding boxes que cobrem a maior parte do território de cada zona.
 *
 * ORDEM DE PRIORIDADE:
 *   Centro → Norte → Oeste → Leste → Sul
 *
 * Razão: as bounding boxes têm sobreposições inevitáveis (boxes retangulares
 * não captam fronteiras curvas das zonas reais). Pontos em sobreposição são
 * atribuídos à zona que aparecer primeiro na lista. Sul é mais ampla e
 * fica por último para não "engolir" pontos do Oeste (Cidade Jardim, Morumbi,
 * Vila Sônia, Pinheiros) ou do Leste (Vila Prudente).
 */
const SP_BOUNDING_BOXES: ZoneDefinition[] = [
  // Centro tem precedência por ser mais restritivo
  {
    zona: "Centro",
    boxes: [
      // Sé, República, Bom Retiro, Liberdade, Bela Vista, Cambuci, Santa Cecília
      { minLat: -23.5605, maxLat: -23.5275, minLng: -46.66, maxLng: -46.625 },
    ],
  },
  {
    zona: "Zona Norte",
    boxes: [
      // Santana, Tucuruvi, Vila Maria, Casa Verde, Limão, Brasilândia, Freguesia, Pirituba, Perus, Jaçanã
      { minLat: -23.53, maxLat: -23.38, minLng: -46.77, maxLng: -46.45 },
    ],
  },
  {
    zona: "Zona Oeste",
    boxes: [
      // Lapa, Butantã, Pinheiros, Vila Sônia, Morumbi, Jaguaré, Rio Pequeno, Raposo Tavares, Barra Funda
      // Cidade Jardim / Jd. Everest também caem aqui pelas coordenadas reais.
      { minLat: -23.64, maxLat: -23.5, minLng: -46.85, maxLng: -46.66 },
    ],
  },
  {
    zona: "Zona Leste",
    boxes: [
      // Mooca, Tatuapé, Penha, Vila Prudente, Sapopemba, Aricanduva, Itaim Paulista, Itaquera, São Mateus, Guaianases, Ermelino, São Miguel, Cidade Tiradentes
      // minLat -23.580 e minLng -46.605 evitam pegar Ipiranga (Zona Sul real)
      { minLat: -23.58, maxLat: -23.43, minLng: -46.605, maxLng: -46.35 },
    ],
  },
  {
    // Sul fica por último — pega o que sobrou após Centro/Norte/Oeste/Leste
    zona: "Zona Sul",
    boxes: [
      // Ipiranga, Jabaquara, Saúde, Vila Mariana, Cursino, Cidade Ademar, Santo Amaro, Capela do Socorro, Parelheiros, M'Boi Mirim
      { minLat: -23.87, maxLat: -23.56, minLng: -46.77, maxLng: -46.58 },
    ],
  },
];

function pointInBox(lat: number, lng: number, box: BoundingBox): boolean {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

/**
 * Retorna a zona de São Paulo correspondente a um par lat/lng, ou `null`
 * se as coordenadas estão fora do município de SP ou inválidas.
 *
 * Verifica zonas em ordem de prioridade: Centro primeiro (mais restritivo),
 * depois Norte / Sul / Leste / Oeste. Bairros que caem em zonas sobrepostas
 * resolvem para a zona com prioridade maior.
 */
export function coordinatesToZone(
  lat: number | null | undefined,
  lng: number | null | undefined,
): ZonaSP | null {
  if (
    lat === null ||
    lat === undefined ||
    lng === null ||
    lng === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  // SP município ocupa aproximadamente lat -24.0 a -23.4 e lng -46.85 a -46.35.
  // Pontos fora dessa área não são SP.
  if (lat < -24.0 || lat > -23.35 || lng < -46.85 || lng > -46.35) {
    return null;
  }

  for (const def of SP_BOUNDING_BOXES) {
    if (def.boxes.some((b) => pointInBox(lat, lng, b))) {
      return def.zona;
    }
  }

  return null;
}

// Exports para teste
export const __test__ = { SP_BOUNDING_BOXES, pointInBox };
