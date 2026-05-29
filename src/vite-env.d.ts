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
  /** Habilita hidratação do tracker por metadata.journey_snapshot no chat (legado; padrão: ligado). */
  readonly VITE_ENABLE_JOURNEY_SNAPSHOT?: string;
  /** Desliga journey_snapshot no frontend quando true/1. */
  readonly VITE_DISABLE_JOURNEY_SNAPSHOT?: string;
  /** CHB-001: desliga heurísticas locais no envio (só COLLECTION_PROGRESS/snapshot). */
  readonly VITE_DISABLE_LOCAL_FIELD_HEURISTICS?: string;
  /** CHB-001: com snapshot ativo, não aplica heurísticas locais (true/1). */
  readonly VITE_LOCAL_FIELD_HEURISTICS_MINIMAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}