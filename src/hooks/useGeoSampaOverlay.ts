import { useState, useEffect, useCallback, useRef } from "react";
import {
  GEOSAMPA_OVERLAY_LAYERS,
  buildWfsUrl,
  type GeoSampaOverlayLayer,
} from "@/config/geosampa-overlay-layers";
import { supabaseAnonKey } from "@/integrations/supabase/client";

export interface GeoSampaOverlayState {
  layer: GeoSampaOverlayLayer;
  geojson: GeoJSON.FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

export function useGeoSampaOverlay(enabledLayerIds: string[]) {
  const [layers, setLayers] = useState<Record<string, GeoSampaOverlayState>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  const fetchLayer = useCallback(async (layer: GeoSampaOverlayLayer) => {
    const url = buildWfsUrl(layer);
    const isSupabaseProxy = url.includes("/functions/v1/geosampa-wfs-proxy");
    const headers: Record<string, string> = {
      Accept: "application/geo+json, application/json",
    };
    if (isSupabaseProxy && supabaseAnonKey) {
      headers.Authorization = `Bearer ${supabaseAnonKey}`;
    }
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = (await res.json()) as GeoJSON.FeatureCollection;
      if (!geojson?.features) throw new Error("Resposta inválida");
      return geojson;
    } catch (e) {
      console.warn(`[GeoSampa overlay] Falha ao carregar ${layer.id}:`, e);
      throw e;
    }
  }, []);

  useEffect(() => {
    const toLoad = enabledLayerIds.filter(Boolean);
    GEOSAMPA_OVERLAY_LAYERS.forEach((l) => {
      if (!enabledLayerIds.includes(l.id)) loadedRef.current.delete(l.id);
    });
    if (toLoad.length === 0) {
      setLayers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (!enabledLayerIds.includes(id)) delete next[id];
        });
        return next;
      });
      return;
    }

    toLoad.forEach((id) => {
      const layer = GEOSAMPA_OVERLAY_LAYERS.find((l) => l.id === id);
      if (!layer) return;
      if (loadedRef.current.has(id)) return;
      loadedRef.current.add(id);

      setLayers((prev) => ({
        ...prev,
        [id]: {
          layer,
          geojson: prev[id]?.geojson ?? null,
          loading: true,
          error: null,
        },
      }));

      fetchLayer(layer)
        .then((geojson) => {
          setLayers((prev) => ({
            ...prev,
            [id]: {
              layer,
              geojson,
              loading: false,
              error: null,
            },
          }));
        })
        .catch((err) => {
          setLayers((prev) => ({
            ...prev,
            [id]: {
              layer,
              geojson: null,
              loading: false,
              error: err?.message ?? "Erro ao carregar",
            },
          }));
        });
    });
  }, [enabledLayerIds.join(",")]);

  return layers;
}

export { GEOSAMPA_OVERLAY_LAYERS };
