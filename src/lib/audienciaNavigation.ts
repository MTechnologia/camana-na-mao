/** Voltar do detalhe da audiência para Minhas Inscrições → aba Audiências públicas. */
export const PERFIL_INSCRICOES_AUDIENCIAS_BACK = "/perfil/inscricoes?aba=audiencias";

export type AudienciaRouteState = { from?: string };

export function readAudienciaBackPath(state: unknown): string {
  const from = (state as AudienciaRouteState | null)?.from;
  return typeof from === "string" && from.length > 0 ? from : "/audiencias";
}

export function withAudienciaFrom(from: string): AudienciaRouteState {
  return { from };
}
