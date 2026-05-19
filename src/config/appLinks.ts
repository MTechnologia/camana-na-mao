/** Rota inicial do app cidadão (mesmo SPA que o painel admin). */
export const CITIZEN_APP_HOME = '/';

/**
 * URL externa opcional — só quando o app cidadão estiver em outro domínio.
 * Se não definida, "Voltar ao App" usa navegação interna para {@link CITIZEN_APP_HOME}.
 */
export const CITIZEN_APP_EXTERNAL_URL = import.meta.env.VITE_CITIZEN_APP_URL?.trim() || undefined;

export function isCitizenAppExternal(): boolean {
  return Boolean(CITIZEN_APP_EXTERNAL_URL);
}
