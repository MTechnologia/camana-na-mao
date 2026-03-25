import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { isGpsAccuracyAcceptable } from "@/lib/gpsAccuracy";

// Localização simulada padrão (Praça da Sé, São Paulo - Centro) — só após falha de GPS quando o usuário pede "minha localização"
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

export interface UseGeolocationOptions {
  /**
   * Se false, não chama getCurrentPosition ao montar (ex.: Perto de você usa endereço cadastrado primeiro).
   * Coordenadas ficam null até refetch().
   */
  autoRequest?: boolean;
}

export const useGeolocation = (options?: UseGeolocationOptions) => {
  const autoRequest = options?.autoRequest !== false;
  const mountedRef = useRef(true);

  const [state, setState] = useState<GeolocationState>(() =>
    autoRequest
      ? {
          latitude: SIMULATED_LOCATION.latitude,
          longitude: SIMULATED_LOCATION.longitude,
          error: null,
          loading: false,
          permissionGranted: false,
          isSimulated: true,
        }
      : {
          latitude: null,
          longitude: null,
          error: null,
          loading: false,
          permissionGranted: false,
          isSimulated: false,
        },
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
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

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const accuracy = position.coords.accuracy;
        if (!isGpsAccuracyAcceptable(accuracy)) {
          toast.info(
            accuracy != null
              ? `Precisão insuficiente (${Math.round(accuracy)}m). Requer ≤15m. Use área aberta ou CEP.`
              : "Precisão não verificada. Tente em área aberta ou use CEP/endereço.",
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
        if (!mountedRef.current) return;
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
        maximumAge: 300000,
      },
    );
  }, []);

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest, requestLocation]);

  return {
    ...state,
    refetch: requestLocation,
  };
};
