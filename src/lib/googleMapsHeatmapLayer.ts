import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";
import type {
  HeatmapWeightedPoint,
  HeatmapLayerOptions,
  GoogleHeatmapLayer,
} from "./googleMapsHeatmapTypes";

export type {
  GoogleHeatmapLayer,
  HeatmapWeightedPoint,
  HeatmapLayerOptions,
} from "./googleMapsHeatmapTypes";

/** Paleta semelhante ao gradiente padrão do Google (azul → verde → amarelo → vermelho). */
const BASE_COLOR_RANGE: ReadonlyArray<[number, number, number, number]> = [
  [65, 182, 196, 0],
  [127, 205, 187, 120],
  [199, 233, 180, 180],
  [237, 248, 177, 220],
  [255, 237, 160, 240],
  [254, 217, 118, 250],
  [254, 178, 76, 255],
  [253, 141, 60, 255],
  [252, 78, 42, 255],
  [227, 26, 28, 255],
];

let heatmapLayerSeq = 0;

function colorRangeWithOpacity(opacity: number): [number, number, number, number][] {
  const alphaScale = Math.max(0, Math.min(1, opacity));
  return BASE_COLOR_RANGE.map(([r, g, b, a]) => [r, g, b, Math.round(a * alphaScale)]);
}

/**
 * Aguarda o próximo `idle` do mapa.
 *
 * Importante: depois do primeiro carregamento, o mapa pode já estar "idle" sem
 * disparar o evento de novo até haver atividade de renderização. Só escutar
 * `idle` deixa a Promise pendente para sempre — o heatmap antigo some e o
 * novo nunca é criado (ex.: troca de período no admin sem mover o mapa).
 */
function waitForMapIdle(map: google.maps.Map): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      listener.remove();
      window.clearTimeout(fallbackId);
      resolve();
    };

    const listener = map.addListener("idle", finish);
    const fallbackId = window.setTimeout(finish, 900);

    try {
      // Força um ciclo de render; costuma disparar `idle` mesmo quando o mapa já estava parado.
      map.panBy(0, 0);
    } catch {
      /* panBy pode falhar em contextos raros; o timeout cobre o desbloqueio */
    }
  });
}

type DeckHeatmapDatum = { position: [number, number]; weight: number };

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function buildDeckHeatmapLayer(
  points: HeatmapWeightedPoint[],
  options: HeatmapLayerOptions,
): HeatmapLayer<DeckHeatmapDatum> {
  const data: DeckHeatmapDatum[] = points.map((p) => ({
    position: [p.lng, p.lat],
    weight: Math.max(1, p.weight),
  }));

  heatmapLayerSeq += 1;
  const suffix = options.layerIdSuffix ?? String(heatmapLayerSeq);

  return new HeatmapLayer<DeckHeatmapDatum>({
    id: `heatmap-${suffix}`,
    data,
    pickable: false,
    getPosition: (d) => d.position,
    getWeight: (d) => d.weight,
    radiusPixels: options.radius ?? 28,
    intensity: options.intensity ?? 1,
    threshold: 0.05,
    debounceTimeout: options.debounceTimeout ?? 0,
    colorRange: colorRangeWithOpacity(options.opacity ?? 0.85),
  });
}

/**
 * Mapa de calor via deck.gl + GoogleMapsOverlay (substitui visualization.HeatmapLayer, descontinuado no Maps JS).
 * @see https://developers.google.com/maps/documentation/javascript/examples/deckgl-heatmap
 */
export async function createGoogleHeatmapLayer(
  map: google.maps.Map,
  points: HeatmapWeightedPoint[],
  options: HeatmapLayerOptions = {},
): Promise<GoogleHeatmapLayer> {
  if (points.length === 0) {
    throw new Error("Sem pontos para o mapa de calor.");
  }

  if (options.skipMapIdle) {
    await nextFrame();
  } else {
    await waitForMapIdle(map);
  }

  const layer = buildDeckHeatmapLayer(points, options);
  const overlay = new GoogleMapsOverlay({
    layers: [layer],
    // Evita modo interleaved (bug de blending do HeatmapLayer em overlays — deck.gl #9452).
    interleaved: false,
  });
  overlay.setMap(map);

  return {
    setMap(target) {
      overlay.setMap(target);
      if (!target) {
        try {
          overlay.finalize();
        } catch {
          /* overlay já finalizado */
        }
      }
    },
  };
}

export function heatmapLayerErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("weightsTexture") || msg.includes("deck") || msg.includes("WebGL")) {
    return "Não foi possível renderizar o mapa de calor (WebGL). Recarregue a página ou tente outro navegador.";
  }
  return "Não foi possível renderizar o mapa de calor.";
}
