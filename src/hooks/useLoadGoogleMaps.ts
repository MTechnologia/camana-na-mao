import { useState, useEffect, useRef } from 'react';
import { googleMapsScriptUrl, isGoogleMapsScript } from '@/lib/googleMapsLoader';

declare global {
  interface Window {
    __googleMapsCallback?: () => void;
    google?: typeof google;
  }
}

/**
 * Carrega o script da API Google Maps e sinaliza quando estiver pronto.
 * Mapas de calor usam deck.gl (@deck.gl/google-maps + HeatmapLayer).
 * Requer VITE_GOOGLE_MAPS_API_KEY no .env.
 */
export function useLoadGoogleMaps(apiKey: string | undefined) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!apiKey || typeof window === 'undefined') {
      setError('Chave da API não configurada');
      return;
    }

    if (
      window.google?.maps &&
      (typeof window.google.maps.Map === 'function' ||
        typeof (window.google.maps as { importLibrary?: unknown }).importLibrary === 'function')
    ) {
      setIsLoaded(true);
      return;
    }

    const isMapsReady = () =>
      !!window.google?.maps &&
      (typeof window.google.maps.Map === 'function' ||
        typeof (window.google.maps as { importLibrary?: unknown }).importLibrary === 'function');

    const waitForMapsReady = (timeoutMs = 5000, intervalMs = 100) =>
      new Promise<boolean>((resolve) => {
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
          if (!mountedRef.current) {
            window.clearInterval(timer);
            resolve(false);
            return;
          }
          if (isMapsReady()) {
            window.clearInterval(timer);
            resolve(true);
            return;
          }
          if (Date.now() - startedAt >= timeoutMs) {
            window.clearInterval(timer);
            resolve(false);
          }
        }, intervalMs);
      });

    const existing = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      if (!isGoogleMapsScript(existing.getAttribute('src'))) {
        setError('Script do Google Maps inválido. Recarregue a página.');
        return;
      }
      if (isMapsReady()) {
        setIsLoaded(true);
      } else {
        existing.addEventListener('load', async () => {
          if (!mountedRef.current) return;
          const ready = await waitForMapsReady();
          if (!mountedRef.current) return;
          if (ready) setIsLoaded(true);
          else setError('Google Maps carregou incompleto (Map indisponível)');
        });
      }
      return;
    }

    const callbackName = '__googleMapsCallback' as const;

    window.__googleMapsCallback = async () => {
      if (!mountedRef.current) return;
      const ready = await waitForMapsReady();
      if (!mountedRef.current) return;
      if (ready) setIsLoaded(true);
      else setError('Google Maps carregou incompleto (Map indisponível)');
    };

    const script = document.createElement('script');
    script.src = googleMapsScriptUrl(apiKey, callbackName);
    script.async = true;
    script.defer = true;
    script.onerror = () => setError('Falha ao carregar Google Maps');
    document.head.appendChild(script);

    return () => {
      mountedRef.current = false;
      window.__googleMapsCallback = () => {};
    };
  }, [apiKey]);

  return { isLoaded, error };
}
