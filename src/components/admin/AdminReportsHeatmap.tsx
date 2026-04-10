import { useEffect, useRef, useState } from "react";
import { useLoadGoogleMaps } from "@/hooks/useLoadGoogleMaps";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import type { HeatmapPoint } from "@/lib/reportsHeatmapData";

const SP_CENTER = { lat: -23.5505, lng: -46.6333 };

type AdminReportsHeatmapProps = {
  points: HeatmapPoint[];
};

type HeatmapLayerInstance = { setMap: (map: google.maps.Map | null) => void };

export function AdminReportsHeatmap({ points }: AdminReportsHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const heatmapRef = useRef<HeatmapLayerInstance | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, error: loadError } = useLoadGoogleMaps(apiKey);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    let cancelled = false;
    setMapReady(false);

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

    if (points.length === 0) return;

    let cancelled = false;

    const run = async () => {
      try {
        const g = window.google.maps as typeof google.maps & {
          importLibrary?: (name: string) => Promise<{ HeatmapLayer?: new (opts: object) => HeatmapLayerInstance }>;
        };

        let HeatmapLayerCtor: new (opts: object) => HeatmapLayerInstance;

        if (typeof g.importLibrary === "function") {
          const vis = await g.importLibrary("visualization");
          if (!vis?.HeatmapLayer) throw new Error("HeatmapLayer indisponível");
          HeatmapLayerCtor = vis.HeatmapLayer;
        } else {
          const legacy = (
            google.maps as typeof google.maps & {
              visualization?: { HeatmapLayer: new (opts: object) => HeatmapLayerInstance };
            }
          ).visualization;
          if (!legacy?.HeatmapLayer) throw new Error("Biblioteca visualization não carregada");
          HeatmapLayerCtor = legacy.HeatmapLayer;
        }

        if (cancelled || !mapInstanceRef.current) return;

        const maxW = Math.max(...points.map((p) => p.weight), 1);
        const data = points.map((p) => ({
          location: new google.maps.LatLng(p.lat, p.lng),
          weight: p.weight,
        }));

        const heatmap = new HeatmapLayerCtor({
          map: mapInstanceRef.current,
          data,
          radius: 28,
          opacity: 0.85,
          maxIntensity: maxW,
        });
        heatmapRef.current = heatmap;
      } catch (e) {
        console.error("[AdminReportsHeatmap] heatmap:", e);
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
