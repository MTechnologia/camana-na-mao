import { useEffect, useRef, useState } from "react";
import { useLoadGoogleMaps } from "@/hooks/useLoadGoogleMaps";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import {
  createGoogleHeatmapLayer,
  heatmapLayerErrorMessage,
  type GoogleHeatmapLayer,
} from "@/lib/googleMapsHeatmapLayer";
import type { HeatmapPoint } from "@/lib/reportsHeatmapData";

const SP_CENTER = { lat: -23.5505, lng: -46.6333 };

type AdminReportsHeatmapProps = {
  points: HeatmapPoint[];
};

export function AdminReportsHeatmap({ points }: AdminReportsHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const heatmapRef = useRef<GoogleHeatmapLayer | null>(null);
  /** Após o 1º overlay, pula `waitForMapIdle` nas atualizações (troca de período fica bem mais rápida). */
  const skipMapIdleAfterFirstRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, error: loadError } = useLoadGoogleMaps(apiKey);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    let cancelled = false;
    setMapReady(false);
    setHeatmapError(null);

    const init = async () => {
      let MapCtor: (new (el: HTMLElement, opts?: google.maps.MapOptions) => google.maps.Map) | null =
        typeof window.google?.maps?.Map === "function"
          ? (window.google.maps.Map as new (el: HTMLElement, opts?: google.maps.MapOptions) => google.maps.Map)
          : null;

      if (!MapCtor && typeof (window.google.maps as { importLibrary?: (n: string) => Promise<{ Map?: typeof google.maps.Map }> }).importLibrary === "function") {
        try {
          const mapsLib = await (window.google.maps as { importLibrary: (n: string) => Promise<{ Map?: typeof google.maps.Map }> }).importLibrary("maps");
          MapCtor = mapsLib?.Map ?? null;
        } catch (e) {
          console.error("[AdminReportsHeatmap] importLibrary(maps) falhou:", e);
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
      setMapReady(true);
    };

    void init();

    return () => {
      cancelled = true;
      setMapReady(false);
      skipMapIdleAfterFirstRef.current = false;
      heatmapRef.current?.setMap(null);
      heatmapRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [isLoaded]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !window.google?.maps) return;

    heatmapRef.current?.setMap(null);
    heatmapRef.current = null;
    setHeatmapError(null);

    if (points.length === 0) return;

    let cancelled = false;

    const run = async () => {
      try {
        const skipIdle = skipMapIdleAfterFirstRef.current;
        const heatmap = await createGoogleHeatmapLayer(map, points, {
          radius: 56,
          opacity: 0.85,
          intensity: 1.2,
          layerIdSuffix: 'reports',
          skipMapIdle: skipIdle,
        });
        if (cancelled || !mapInstanceRef.current) {
          heatmap.setMap(null);
          return;
        }
        heatmapRef.current = heatmap;
        skipMapIdleAfterFirstRef.current = true;
      } catch (e) {
        console.error("[AdminReportsHeatmap] heatmap:", e);
        if (!cancelled) setHeatmapError(heatmapLayerErrorMessage(e));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [mapReady, points]);

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
