import { useEffect, useRef, useState } from "react";
import { useLoadGoogleMaps } from "@/hooks/useLoadGoogleMaps";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import {
  createGoogleHeatmapLayer,
  heatmapLayerErrorMessage,
  type GoogleHeatmapLayer,
} from "@/lib/googleMapsHeatmapLayer";
import type { ServiceRatingsAggregate } from "@/hooks/useRatingsConcentration";

/**
 * HU-4.2 — Mapa com camadas combinadas para concentração de avaliações.
 *
 * Camada 1: Heatmap de densidade (mostra onde há mais volume de avaliações).
 * Camada 2: Bolhas (google.maps.Circle) por equipamento, com:
 *   - tamanho proporcional ao volume
 *   - cor pela média de estrelas (gradiente vermelho → amarelo → verde)
 * Click em uma bolha dispara `onSelect` com o agregado completo.
 */

const SP_CENTER = { lat: -23.5505, lng: -46.6333 };

interface RatingsBubbleMapProps {
  aggregates: ServiceRatingsAggregate[];
  onSelect: (agg: ServiceRatingsAggregate) => void;
}

/**
 * Cor por média de estrelas: gradiente vermelho (1) → amarelo (3) → verde (5).
 * Exportada para teste.
 */
export function colorForAvgStars(avg: number): string {
  // Clamp 1..5
  const v = Math.max(1, Math.min(5, avg));
  // Interpolação HSL: vermelho (0deg) → amarelo (60deg) → verde (120deg)
  const hue = ((v - 1) / 4) * 120;
  return `hsl(${Math.round(hue)}, 75%, 45%)`;
}

/**
 * Raio em metros proporcional ao volume.
 */
export function radiusForCount(count: number): number {
  // Mín 80m, máx 600m. Escala log para suavizar outliers.
  const log = Math.log10(Math.max(1, count));
  return Math.min(600, Math.max(80, 80 + log * 200));
}

export function RatingsBubbleMap({ aggregates, onSelect }: RatingsBubbleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const heatmapRef = useRef<GoogleHeatmapLayer | null>(null);
  const skipMapIdleAfterFirstRef = useRef(false);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, error: loadError } = useLoadGoogleMaps(apiKey);

  // Inicializa o mapa
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;
    let cancelled = false;
    setMapReady(false);

    const init = async () => {
      let MapCtor: (new (el: HTMLElement, opts?: google.maps.MapOptions) => google.maps.Map) | null =
        typeof window.google?.maps?.Map === "function"
          ? (window.google.maps.Map as new (el: HTMLElement, opts?: google.maps.MapOptions) => google.maps.Map)
          : null;

      if (
        !MapCtor &&
        typeof (window.google.maps as { importLibrary?: (n: string) => Promise<{ Map?: typeof google.maps.Map }> }).importLibrary === "function"
      ) {
        try {
          const mapsLib = await (
            window.google.maps as { importLibrary: (n: string) => Promise<{ Map?: typeof google.maps.Map }> }
          ).importLibrary("maps");
          MapCtor = mapsLib?.Map ?? null;
        } catch (e) {
          console.error("[RatingsBubbleMap] importLibrary falhou:", e);
        }
      }

      if (!MapCtor || cancelled || !mapRef.current) return;

      const map = new MapCtor(mapRef.current, {
        center: SP_CENTER,
        zoom: 11,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
      if (cancelled) return;
      mapInstanceRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();
      setMapReady(true);
    };

    void init();
    return () => {
      cancelled = true;
      setMapReady(false);
      skipMapIdleAfterFirstRef.current = false;
      heatmapRef.current?.setMap(null);
      heatmapRef.current = null;
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [isLoaded]);

  // Renderiza camadas (heatmap + bolhas) quando os dados mudam
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !window.google?.maps) return;

    // Limpa anteriores
    heatmapRef.current?.setMap(null);
    heatmapRef.current = null;
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    setHeatmapError(null);

    if (aggregates.length === 0) return;

    let cancelled = false;
    const run = async () => {
      try {
        if (cancelled || !mapInstanceRef.current) return;

        const heatmapPoints = aggregates.map((a) => ({
          lat: a.lat,
          lng: a.lng,
          weight: a.count,
        }));
        const hm = await createGoogleHeatmapLayer(mapInstanceRef.current, heatmapPoints, {
          radius: 24,
          opacity: 0.45,
          layerIdSuffix: 'ratings',
          skipMapIdle: skipMapIdleAfterFirstRef.current,
        });
        if (cancelled || !mapInstanceRef.current) {
          hm.setMap(null);
          return;
        }
        heatmapRef.current = hm;
        skipMapIdleAfterFirstRef.current = true;

        // Bolhas (camada 2)
        aggregates.forEach((a) => {
          const color = colorForAvgStars(a.avgStars);
          const radius = radiusForCount(a.count);
          const circle = new google.maps.Circle({
            map: mapInstanceRef.current,
            center: { lat: a.lat, lng: a.lng },
            radius,
            strokeColor: color,
            strokeOpacity: 0.9,
            strokeWeight: 1.5,
            fillColor: color,
            fillOpacity: 0.55,
            clickable: true,
          });
          circle.addListener("click", () => {
            onSelect(a);
            const iw = infoWindowRef.current;
            if (iw) {
              iw.setContent(
                `<div style="font-family: system-ui, sans-serif; font-size: 12px; min-width:160px;">
                  <div style="font-weight:600">${a.serviceName ?? "Serviço sem nome"}</div>
                  <div style="color:#666; margin-top:2px">${a.serviceType ?? ""}</div>
                  <div style="margin-top:4px">⭐ ${a.avgStars.toFixed(2)} · ${a.count} avaliações</div>
                  <div style="color:#666; font-size:10px; margin-top:2px">Polarização: ${a.polarizationIndex}%</div>
                </div>`,
              );
              iw.setPosition({ lat: a.lat, lng: a.lng });
              iw.open(mapInstanceRef.current);
            }
          });
          circlesRef.current.push(circle);
        });
      } catch (e) {
        console.error("[RatingsBubbleMap] render falhou:", e);
        if (!cancelled) setHeatmapError(heatmapLayerErrorMessage(e));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [mapReady, aggregates, onSelect]);

  if (!apiKey) {
    return (
      <div className="flex h-[min(70vh,560px)] min-h-[400px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        {getGoogleMapsNotConfiguredMessage()}
      </div>
    );
  }

  if (loadError || heatmapError) {
    return (
      <div className="flex h-[min(70vh,560px)] min-h-[400px] items-center justify-center rounded-lg border border-destructive/30 p-4 text-center text-sm text-destructive">
        {loadError ?? heatmapError}
      </div>
    );
  }

  return (
    <div className="h-[min(70vh,560px)] min-h-[400px] w-full overflow-hidden rounded-lg border">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}

// Exports para teste
export const __test__ = { colorForAvgStars, radiusForCount };
