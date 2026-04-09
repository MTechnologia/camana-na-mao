import { useEffect, useRef } from "react";
import { useLoadGoogleMaps } from "@/hooks/useLoadGoogleMaps";
import { getGoogleMapsApiKey } from "@/lib/googleMapsKey";
import type { OlhoVivoBusMarker } from "@/lib/parseOlhoVivoPosicao";
import { BUS_MAP_ICON_DATA_URL } from "@/lib/busMapIcon";

type UserPos = { lat: number; lng: number };

interface LiveBusMapProps {
  buses: OlhoVivoBusMarker[];
  userLocation: UserPos | null;
  className?: string;
}

const SP_DEFAULT = { lat: -23.5505, lng: -46.6333 };
const MOVE_MS = 900;

function animateMarkerPosition(
  marker: google.maps.Marker,
  to: google.maps.LatLng,
  durationMs: number,
) {
  const from = marker.getPosition();
  if (!from) {
    marker.setPosition(to);
    return;
  }
  const flat = from.lat();
  const flng = from.lng();
  const tlat = to.lat();
  const tlng = to.lng();
  const start = performance.now();
  const tick = (now: number) => {
    const u = Math.min(1, (now - start) / durationMs);
    const ease = u * (2 - u);
    const lat = flat + (tlat - flat) * ease;
    const lng = flng + (tlng - flng) * ease;
    marker.setPosition({ lat, lng });
    if (u < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function LiveBusMap({ buses, userLocation, className }: LiveBusMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const busMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, error: loadError } = useLoadGoogleMaps(apiKey);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    const MapCtor =
      typeof window.google.maps.Map === "function"
        ? window.google.maps.Map
        : null;
    if (!MapCtor) return;

    const center =
      userLocation ??
      (buses[0] ? { lat: buses[0].lat, lng: buses[0].lng } : SP_DEFAULT);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new MapCtor(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    const map = mapInstanceRef.current;

    const busIcon: google.maps.Icon | undefined =
      typeof google.maps.Size === "function"
        ? {
            url: BUS_MAP_ICON_DATA_URL,
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 34),
          }
        : undefined;

    const nextIds = new Set(buses.map((b) => b.id));
    for (const [id, marker] of busMarkersRef.current) {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        busMarkersRef.current.delete(id);
      }
    }

    buses.forEach((b) => {
      const pos = new google.maps.LatLng(b.lat, b.lng);
      let marker = busMarkersRef.current.get(b.id);
      if (!marker) {
        marker = new google.maps.Marker({
          position: pos,
          map,
          title: b.label,
          zIndex: 2,
          ...(busIcon ? { icon: busIcon } : {}),
        });
        busMarkersRef.current.set(b.id, marker);
      } else {
        marker.setTitle(b.label);
        animateMarkerPosition(marker, pos, MOVE_MS);
      }
    });

    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          position: userLocation,
          map,
          title: "Você",
          zIndex: 1_000,
        });
      } else {
        animateMarkerPosition(
          userMarkerRef.current,
          new google.maps.LatLng(userLocation.lat, userLocation.lng),
          MOVE_MS,
        );
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    if (buses.length > 0 || userLocation) {
      const bounds = new google.maps.LatLngBounds();
      buses.forEach((b) => bounds.extend({ lat: b.lat, lng: b.lng }));
      if (userLocation) bounds.extend(userLocation);
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(SP_DEFAULT);
      map.setZoom(11);
    }
  }, [isLoaded, buses, userLocation]);

  if (!apiKey || loadError) {
    return (
      <div
        className={
          className ??
          "rounded-lg border bg-muted/40 flex items-center justify-center min-h-[240px] text-sm text-muted-foreground p-4 text-center"
        }
      >
        {loadError ?? "Mapa indisponível: configure VITE_GOOGLE_MAPS_API_KEY."}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={
          className ??
          "rounded-lg border bg-muted/20 min-h-[240px] flex items-center justify-center text-sm text-muted-foreground"
        }
      >
        Carregando mapa…
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={className ?? "w-full min-h-[280px] rounded-lg border overflow-hidden"}
      role="region"
      aria-label="Mapa com posição dos ônibus"
    />
  );
}
