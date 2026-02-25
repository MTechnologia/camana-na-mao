/**
 * Lê a chave do Google Maps exposta pelo Vite (VITE_GOOGLE_MAPS_API_KEY).
 * Remove aspas e espaços; retorna undefined se vazia.
 * No dev: variáveis vêm do .env (reinicie npm run dev após alterar).
 * No build: variáveis são embutidas no bundle — defina no momento do build (ex.: Cloud Build substitution _VITE_GOOGLE_MAPS_API_KEY ou .env ao rodar npm run build).
 */
export function getGoogleMapsApiKey(): string | undefined {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (typeof raw !== "string") return undefined;
  const key = raw.replace(/^["']|["']$/g, "").trim();
  return key || undefined;
}

/** Mensagem quando o mapa não está configurado (difere dev vs build). */
export function getGoogleMapsNotConfiguredMessage(): string {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return "Configure VITE_GOOGLE_MAPS_API_KEY no .env na raiz do projeto e reinicie o servidor (npm run dev).";
  }
  return "Mapa não configurado. Defina VITE_GOOGLE_MAPS_API_KEY no momento do build (ex.: variáveis do Cloud Build). Veja docs/MAPA_GOOGLE_MAPS_PLATFORM.md.";
}
