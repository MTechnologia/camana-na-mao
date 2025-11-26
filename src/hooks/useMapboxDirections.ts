import { useState } from 'react';

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
}

export interface DirectionsResult {
  route: GeoJSON.Feature;
  distance: number;
  duration: number;
  steps: NavigationStep[];
}

type TransportMode = 'walking' | 'driving' | 'cycling';

export const useMapboxDirections = (mapboxToken: string | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);

  const getDirections = async (
    origin: [number, number],
    destination: [number, number],
    mode: TransportMode = 'walking'
  ) => {
    if (!mapboxToken) {
      setError('Token do Mapbox não configurado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?steps=true&geometries=geojson&access_token=${mapboxToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar direções');
      }

      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('Nenhuma rota encontrada');
      }

      const route = data.routes[0];
      
      const result: DirectionsResult = {
        route: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
        distance: route.distance,
        duration: route.duration,
        steps: route.legs[0].steps.map((step: any) => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
          maneuver: step.maneuver.type,
        })),
      };

      setDirections(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearDirections = () => {
    setDirections(null);
    setError(null);
  };

  return {
    getDirections,
    clearDirections,
    directions,
    loading,
    error,
  };
};
