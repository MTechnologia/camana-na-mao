/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CAMARA_PROJECT_ID?: string;
  readonly CAMARA_PUBLISHABLE_KEY?: string;
  readonly CAMARA_URL?: string;

  // Legacy (supported temporarily during migration)
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;

  /** API key Google Maps Platform. Quando definida, o mapa real é exibido em "Perto de Você". */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}