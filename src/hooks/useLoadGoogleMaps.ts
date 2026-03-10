import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    __googleMapsCallback?: () => void;
    google?: typeof google;
  }
}

/**
 * Carrega o script da API Google Maps e sinaliza quando estiver pronto.
 * Requer VITE_GOOGLE_MAPS_API_KEY no .env.
 * Usa loading=async conforme recomendação do Google para melhor performance.
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

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if (window.google?.maps) setIsLoaded(true);
      else existing.addEventListener('load', () => mountedRef.current && setIsLoaded(true));
      return;
    }

    const callbackName = '__googleMapsCallback';
    (window as any)[callbackName] = () => {
      if (mountedRef.current) setIsLoaded(true);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setError('Falha ao carregar Google Maps');
    document.head.appendChild(script);

    return () => {
      mountedRef.current = false;
      // Mantém callback como no-op para evitar "callback is not a function"
      // se o script carregar após unmount
      (window as any)[callbackName] = () => {};
    };
  }, [apiKey]);

  return { isLoaded, error };
}
