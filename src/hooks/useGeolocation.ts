import { useState, useEffect } from "react";
import { toast } from "sonner";
import { isGpsAccuracyAcceptable } from "@/lib/gpsAccuracy";

// Localização simulada padrão (Praça da Sé, São Paulo - Centro)
const SIMULATED_LOCATION = {
  latitude: -23.5505,
  longitude: -46.6333,
};

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
  isSimulated: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: SIMULATED_LOCATION.latitude,
    longitude: SIMULATED_LOCATION.longitude,
    error: null,
    loading: false,
    permissionGranted: false,
    isSimulated: true,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      // Usar localização simulada se geolocalização não for suportada
      setState({
        latitude: SIMULATED_LOCATION.latitude,
        longitude: SIMULATED_LOCATION.longitude,
        error: null,
        loading: false,
        permissionGranted: false,
        isSimulated: true,
      });
      toast.info("Usando localização simulada (Centro SP)");
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        if (!isGpsAccuracyAcceptable(accuracy)) {
          toast.info(
            accuracy != null
              ? `Precisão insuficiente (${Math.round(accuracy)}m). Requer ≤15m. Use área aberta ou CEP.`
              : "Precisão não verificada. Tente em área aberta ou use CEP/endereço."
          );
          setState({
            latitude: SIMULATED_LOCATION.latitude,
            longitude: SIMULATED_LOCATION.longitude,
            error: null,
            loading: false,
            permissionGranted: true,
            isSimulated: true,
          });
          return;
        }
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionGranted: true,
          isSimulated: false,
        });
      },
      (error) => {
        let errorMessage = "Erro ao obter localização";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão negada - usando localização simulada";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Localização indisponível - usando localização simulada";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo esgotado - usando localização simulada";
            break;
        }

        // Usar localização simulada quando houver erro
        setState({
          latitude: SIMULATED_LOCATION.latitude,
          longitude: SIMULATED_LOCATION.longitude,
          error: null,
          loading: false,
          permissionGranted: false,
          isSimulated: true,
        });
        toast.info(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return {
    ...state,
    refetch: requestLocation,
  };
};
