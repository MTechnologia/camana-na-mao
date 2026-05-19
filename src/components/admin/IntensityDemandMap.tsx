import { useEffect, useRef, useState } from "react";
import { useLoadGoogleMaps } from "@/hooks/useLoadGoogleMaps";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import type { ZoneIntensity } from "@/hooks/useIntensityDemand";

/**
 * HU-4.3 — Mapa com bolhas por zona, tamanho proporcional ao volume e cor
 * pelo tempo médio composto (verde = rápido, vermelho = lento).
 *
 * Click em bolha dispara `onSelect`.
 */

const SP_CENTER = { lat: -23.5505, lng: -46.6333 };

export type IntensityMapColorBy = 'wait' | 'volume';

interface Props {
  zones: ZoneIntensity[];
  /** Tempo (h) que define a fronteira do "vermelho saturado". */
  maxRedHours?: number;
  /** Cor das bolhas: tempo de espera (padrão) ou volume de relatos. */
  colorBy?: IntensityMapColorBy;
  onSelect: (z: ZoneIntensity) => void;
}

/**
 * Cor por tempo de espera: verde (0h) → amarelo → vermelho saturado (>= maxRedHours).
 * Exportada para teste.
 */
export function colorForWait(hours: number, maxRedHours = 168): string {
  // Saturação a 168h (1 semana) por padrão
  const ratio = Math.max(0, Math.min(1, hours / maxRedHours));
  // verde (120) → vermelho (0) — invertido conforme intensidade
  const hue = Math.round(120 * (1 - ratio));
  return `hsl(${hue}, 75%, 45%)`;
}

/**
 * Raio em metros por count. Mais agressivo que o do RatingsBubbleMap pois
 * temos só ~6 zonas (vs centenas de equipamentos).
 */
export function radiusForCount(count: number): number {
  // Mín 600m, máx 4500m (zonas são grandes).
  const log = Math.log10(Math.max(1, count));
  return Math.min(4500, Math.max(600, 600 + log * 1500));
}

/** Cor por volume relativo (mais relatos = mais vermelho). */
export function colorForVolume(count: number, maxCount: number): string {
  const ratio = maxCount > 0 ? Math.max(0, Math.min(1, count / maxCount)) : 0;
  const hue = Math.round(120 * (1 - ratio));
  return `hsl(${hue}, 75%, 45%)`;
}

export function IntensityDemandMap({
  zones,
  maxRedHours = 168,
  colorBy = 'wait',
  onSelect,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const labelsRef = useRef<google.maps.OverlayView[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, error: loadError } = useLoadGoogleMaps(apiKey);

  // Inicializa mapa
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
          console.error("[IntensityDemandMap] importLibrary falhou:", e);
        }
      }

      if (!MapCtor || cancelled || !mapRef.current) return;
      const map = new MapCtor(mapRef.current, {
        center: SP_CENTER,
        zoom: 10,
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
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
      labelsRef.current.forEach((l) => l.setMap(null));
      labelsRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [isLoaded]);

  // Renderiza bolhas
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !window.google?.maps) return;

    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    if (zones.length === 0) return;

    const maxCount = Math.max(...zones.map((z) => z.count), 1);

    zones.forEach((z) => {
      const color =
        colorBy === 'volume' ? colorForVolume(z.count, maxCount) : colorForWait(z.avgWaitHours, maxRedHours);
      const radius = radiusForCount(z.count);
      const circle = new google.maps.Circle({
        map,
        center: { lat: z.lat, lng: z.lng },
        radius,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.45,
        clickable: true,
      });
      circle.addListener("click", () => {
        onSelect(z);
        const iw = infoWindowRef.current;
        if (iw) {
          iw.setContent(
            `<div style="font-family: system-ui, sans-serif; font-size: 12px; min-width:180px;">
              <div style="font-weight:600">${z.zone}</div>
              <div style="margin-top:4px">📋 ${z.count} relato${z.count === 1 ? "" : "s"}</div>
              <div>⏱ ${z.avgWaitHours.toFixed(1)}h tempo médio composto</div>
              <div style="color:#666; font-size:10px; margin-top:2px">Score de prioridade: ${z.priorityScore}/100</div>
              <div style="color:#666; font-size:10px">${z.resolved} resolvidos · ${z.pending} pendentes${z.rejected > 0 ? ` · ${z.rejected} rejeitados` : ""}</div>
            </div>`,
          );
          iw.setPosition({ lat: z.lat, lng: z.lng });
          iw.open(map);
        }
      });
      circlesRef.current.push(circle);
    });
  }, [mapReady, zones, maxRedHours, colorBy, onSelect]);

  if (!apiKey) {
    return (
      <div className="flex h-[min(70vh,560px)] min-h-[400px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        {getGoogleMapsNotConfiguredMessage()}
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-[min(70vh,560px)] min-h-[400px] items-center justify-center rounded-lg border border-destructive/30 text-sm text-destructive">
        {loadError}
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
export const __test__ = { colorForWait, radiusForCount };
