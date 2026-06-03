/** Compatível com o contrato anterior (`setMap(null)` no unmount). */
export type GoogleHeatmapLayer = {
  setMap: (map: google.maps.Map | null) => void;
};

export type HeatmapWeightedPoint = { lat: number; lng: number; weight: number };

export type HeatmapLayerOptions = {
  /** Raio do kernel (pixels no deck.gl; metros aproximados no HeatmapLayer legado). */
  radius?: number;
  /** Opacidade visual 0–1. */
  opacity?: number;
  /** Intensidade da mancha (deck.gl HeatmapLayer). */
  intensity?: number;
  /**
   * deck.gl agrega o mapa de pesos com debounce ao mudar o zoom (default 500ms),
   * o que deixa a mancha “pulando” após parar de dar zoom. 0 = atualização imediata.
   */
  debounceTimeout?: number;
  /** Se true, não aguarda `idle` do Google Maps (primeira montagem costuma precisar de false). */
  skipMapIdle?: boolean;
  /** Sufixo para id único quando há vários mapas na mesma página (deck.gl). */
  layerIdSuffix?: string;
};
