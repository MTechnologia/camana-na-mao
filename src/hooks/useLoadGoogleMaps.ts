import { useState, useEffect } from 'react';

declare global {
  interface Window {
    __googleMapsCallback?: () => void;
    google?: typeof google;
  }
}

/**
 * Carrega o script da API Google Maps e sinaliza quando estiver pronto.
 * Requer VITE_GOOGLE_MAPS_API_KEY no .env.
 */
export function useLoadGoogleMaps(apiKey: string | undefined) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || typeof window === 'undefined') {
      setError('Chave da API não configurada');
      return;
    }

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if (window.google?.maps) setIsLoaded(true);
      else existing.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const callbackName = '__googleMapsCallback';
    (window as any)[callbackName] = () => setIsLoaded(true);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setError('Falha ao carregar Google Maps');
    document.head.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
    };
  }, [apiKey]);

  return { isLoaded, error };
}
