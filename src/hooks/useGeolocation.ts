import { useState, useEffect, useRef, useCallback } from "react";
import { isGpsAccuracyAcceptable, MAX_GPS_ACCURACY_METERS } from "@/lib/gpsAccuracy";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
}

export interface UseGeolocationOptions {
  /**
   * Se false, não chama getCurrentPosition ao montar (ex.: Perto de você usa endereço cadastrado primeiro).
   * Coordenadas ficam null até refetch().
   */
  autoRequest?: boolean;
  /**
   * Teto de `coords.accuracy` em metros. Padrão 15 (RN04). No PC o navegador costuma reportar centenas de metros;
   * para listas no mapa use `MAX_GPS_ACCURACY_NEARBY_UI_METERS` (gpsAccuracy.ts) ou valor similar.
   */
  maxAccuracyMeters?: number;
}

export const useGeolocation = (options?: UseGeolocationOptions) => {
  const autoRequest = options?.autoRequest !== false;
  const maxAccuracyMeters = options?.maxAccuracyMeters ?? MAX_GPS_ACCURACY_METERS;
  const mountedRef = useRef(true);

  const [state, setState] = useState<GeolocationState>(() => ({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionGranted: false,
  }));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        latitude: null,
        longitude: null,
        error: "Geolocalização não é suportada neste navegador. Use CEP ou endereço cadastrado.",
        loading: false,
        permissionGranted: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const accuracy = position.coords.accuracy;
        if (!isGpsAccuracyAcceptable(accuracy, maxAccuracyMeters)) {
          setState({
            latitude: null,
            longitude: null,
            error:
              accuracy != null
                ? `Precisão insuficiente (${Math.round(accuracy)} m). Tente em área aberta ou use CEP.`
                : "Precisão da localização insuficiente. Tente em área aberta ou use CEP.",
            loading: false,
            permissionGranted: true,
          });
          return;
        }
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionGranted: true,
        });
      },
      (error) => {
        if (!mountedRef.current) return;
        let errorMessage = "Não foi possível obter sua localização";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "O navegador bloqueou a localização. Use o ícone de cadeado ou «i» ao lado do endereço, abra «Permissões do site» / «Definições do site» e permita «Localização» para este endereço. Se já tiver escolhido «Bloquear», altere para «Permitir» e volte a clicar em «Minha posição».";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Localização indisponível no momento";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo esgotado ao obter localização";
            break;
        }

        setState({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
          permissionGranted: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, [maxAccuracyMeters]);

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
