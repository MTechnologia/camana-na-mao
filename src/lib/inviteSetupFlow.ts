/**
 * HU-11.1 — Fluxo de complemento de cadastro pós-convite.
 *
 * Após o usuário aceitar o convite e definir senha + nome (em
 * CompleteInvitePage), encadeamos as próximas etapas usando o query param
 * `?invite=1`. Cada página intermediária detecta esse marcador e, depois
 * de salvar, navega para a próxima etapa do fluxo.
 *
 * Etapas:
 *   1. /completar-convite          → senha + nome + telefone
 *   2. /onboarding?invite=1        → interesses
 *   3. /perfil/endereco?invite=1   → endereço com busca por CEP
 *   4. /perfil/dados-demograficos?invite=1 → gênero/raça/classe/data nasc.
 *   5. /                           → home
 *
 * Pulamos /perfil/dados-pessoais porque nome e telefone já foram capturados
 * em /completar-convite. O usuário pode complementar o resto depois pelo
 * menu Perfil.
 */

export const INVITE_FLAG = "invite";

/** Detecta se a URL atual está dentro do fluxo de complemento de convite. */
export function isInInviteSetupFlow(search: string | URLSearchParams): boolean {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return params.get(INVITE_FLAG) === "1";
}

/**
 * Retorna a próxima URL no fluxo de convite a partir da etapa atual.
 * `null` indica fim do fluxo (home).
 */
export function nextInviteStep(currentPathname: string): string | null {
  const map: Record<string, string | null> = {
    "/completar-convite": `/onboarding?${INVITE_FLAG}=1`,
    "/onboarding": `/perfil/endereco?${INVITE_FLAG}=1`,
    "/perfil/endereco": `/perfil/dados-demograficos?${INVITE_FLAG}=1`,
    "/perfil/dados-demograficos": "/",
  };
  return map[currentPathname] ?? null;
}

/** Retorna { step, total } pra exibir progresso na UI. */
export function inviteStepIndex(currentPathname: string): {
  step: number;
  total: number;
} {
  const order = [
    "/completar-convite",
    "/onboarding",
    "/perfil/endereco",
    "/perfil/dados-demograficos",
  ];
  const idx = order.indexOf(currentPathname);
  return { step: idx >= 0 ? idx + 1 : 0, total: order.length };
}
